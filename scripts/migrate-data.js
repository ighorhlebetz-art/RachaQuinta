'use strict';

// Migra dados do rachas.db local diretamente para PostgreSQL.
// Uso: node scripts/migrate-data.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');
const path = require('path');
const { query, pool } = require('../server/db/pool');

const DB_PATH = path.join(__dirname, '..', 'rachas.db');

async function migrate() {
  const sqlite = new Database(DB_PATH, { readonly: true });

  // ── Limpar destino ──────────────────────────────────────────────────────────
  await query('TRUNCATE racha_jogadores, rachas, jogadores RESTART IDENTITY CASCADE');
  console.log('Destino limpo.');

  // ── jogadores ───────────────────────────────────────────────────────────────
  const jogadores = sqlite.prepare('SELECT * FROM jogadores ORDER BY id').all();
  for (const j of jogadores) {
    await query(
      `INSERT INTO jogadores
         (id, nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [j.id, j.nome, j.fisico, j.ataque, j.defesa, j.tecnica, j.tatica, j.velocidade,
       j.posicao_principal ?? null, j.posicao_secundaria ?? null, j.posicao_terciaria ?? null,
       j.created_at]
    );
  }
  await query(`SELECT setval('jogadores_id_seq', MAX(id)) FROM jogadores`);
  console.log(`✓ ${jogadores.length} jogadores migrados.`);

  // ── rachas ──────────────────────────────────────────────────────────────────
  const rachas = sqlite.prepare('SELECT * FROM rachas ORDER BY id').all();
  for (const r of rachas) {
    let resultado = null;
    if (r.resultado_json) {
      try { resultado = JSON.parse(r.resultado_json); } catch { resultado = null; }
    }
    await query(
      `INSERT INTO rachas
         (id, nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id, resultado_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r.id, r.nome, r.data,
       r.goleiro_a_id ?? null, r.goleiro_b_id ?? null, r.goleiro_c_id ?? null,
       resultado, r.created_at]
    );
  }
  if (rachas.length > 0)
    await query(`SELECT setval('rachas_id_seq', MAX(id)) FROM rachas`);
  console.log(`✓ ${rachas.length} rachas migrados.`);

  // ── racha_jogadores ─────────────────────────────────────────────────────────
  const rjs = sqlite.prepare('SELECT * FROM racha_jogadores').all();
  for (const rj of rjs) {
    await query(
      'INSERT INTO racha_jogadores (racha_id, jogador_id) VALUES ($1,$2)',
      [rj.racha_id, rj.jogador_id]
    );
  }
  console.log(`✓ ${rjs.length} vínculos migrados.`);

  sqlite.close();
}

migrate()
  .then(() => { console.log('\nMigração concluída com sucesso!'); })
  .catch(err => { console.error('\nERRO na migração:', err.message); process.exit(1); })
  .finally(() => pool.end());
