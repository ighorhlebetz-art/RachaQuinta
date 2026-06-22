'use strict';

// Exporta rachas.db → scripts/dump.sql compatível com PostgreSQL.
// Uso: node scripts/export-sqlite.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH  = path.join(__dirname, '..', 'rachas.db');
const OUT_PATH = path.join(__dirname, 'dump.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Arquivo não encontrado: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

const lines = [];

lines.push('-- Dump gerado por scripts/export-sqlite.js');
lines.push(`-- ${new Date().toISOString()}`);
lines.push('');
lines.push('TRUNCATE racha_jogadores, rachas, jogadores RESTART IDENTITY CASCADE;');
lines.push('');

// ── jogadores ────────────────────────────────────────────────────────────────
const jogadores = db.prepare('SELECT * FROM jogadores ORDER BY id').all();
if (jogadores.length > 0) {
  lines.push('-- jogadores');
  for (const j of jogadores) {
    const vals = [
      j.id,
      pgStr(j.nome),
      j.fisico, j.ataque, j.defesa, j.tecnica, j.tatica, j.velocidade,
      pgStr(j.posicao_principal),
      pgStr(j.posicao_secundaria),
      pgStr(j.posicao_terciaria),
      pgStr(j.created_at),
    ].join(', ');
    lines.push(`INSERT INTO jogadores (id, nome, fisico, ataque, defesa, tecnica, tatica, velocidade, posicao_principal, posicao_secundaria, posicao_terciaria, created_at) VALUES (${vals});`);
  }
  lines.push('');
  lines.push(`SELECT setval('jogadores_id_seq', MAX(id)) FROM jogadores;`);
  lines.push('');
}

// ── rachas ───────────────────────────────────────────────────────────────────
const rachas = db.prepare('SELECT * FROM rachas ORDER BY id').all();
if (rachas.length > 0) {
  lines.push('-- rachas');
  for (const r of rachas) {
    let resultadoJson = 'NULL';
    if (r.resultado_json) {
      // Valida JSON antes de inserir
      try { JSON.parse(r.resultado_json); } catch { r.resultado_json = null; }
      if (r.resultado_json) resultadoJson = `'${r.resultado_json.replace(/'/g, "''")}'`;
    }
    const vals = [
      r.id,
      pgStr(r.nome),
      pgStr(r.data),
      r.goleiro_a_id ?? 'NULL',
      r.goleiro_b_id ?? 'NULL',
      r.goleiro_c_id ?? 'NULL',
      resultadoJson,
      pgStr(r.created_at),
    ].join(', ');
    lines.push(`INSERT INTO rachas (id, nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id, resultado_json, created_at) VALUES (${vals});`);
  }
  lines.push('');
  lines.push(`SELECT setval('rachas_id_seq', MAX(id)) FROM rachas;`);
  lines.push('');
}

// ── racha_jogadores ──────────────────────────────────────────────────────────
const rjs = db.prepare('SELECT * FROM racha_jogadores ORDER BY racha_id, jogador_id').all();
if (rjs.length > 0) {
  lines.push('-- racha_jogadores');
  for (const rj of rjs) {
    lines.push(`INSERT INTO racha_jogadores (racha_id, jogador_id) VALUES (${rj.racha_id}, ${rj.jogador_id});`);
  }
  lines.push('');
}

fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');

console.log(`✓ Exportados: ${jogadores.length} jogadores, ${rachas.length} rachas, ${rjs.length} vínculos.`);
console.log(`✓ Arquivo: ${OUT_PATH}`);
console.log('');
console.log('Para importar no Neon:');
console.log('  psql $DATABASE_URL < scripts/dump.sql');

function pgStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}
