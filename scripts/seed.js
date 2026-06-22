'use strict';

// Insere jogadores de exemplo no PostgreSQL se o banco estiver vazio.
// Uso: node scripts/seed.js
// Requer DATABASE_URL no ambiente (ou .env na raiz do projeto).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { query, pool } = require('../server/db/pool');

const JOGADORES = [
  { nome: 'Ivan Muralha',         fisico: 7, ataque: 2,  defesa: 9,  tecnica: 5, tatica: 6, velocidade: 3,  posicao_principal: 'goleiro',  posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Tiago Golão',          fisico: 6, ataque: 1,  defesa: 8,  tecnica: 4, tatica: 5, velocidade: 2,  posicao_principal: 'goleiro',  posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Sandro Paredão',       fisico: 8, ataque: 2,  defesa: 9,  tecnica: 4, tatica: 6, velocidade: 3,  posicao_principal: 'goleiro',  posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Léo Relâmpago',        fisico: 6, ataque: 7,  defesa: 3,  tecnica: 6, tatica: 5, velocidade: 10, posicao_principal: 'atacante', posicao_secundaria: 'meia',     posicao_terciaria: null },
  { nome: 'Caio Flash',           fisico: 5, ataque: 8,  defesa: 2,  tecnica: 5, tatica: 4, velocidade: 9,  posicao_principal: 'atacante', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Bruno Foguete',        fisico: 6, ataque: 6,  defesa: 3,  tecnica: 5, tatica: 5, velocidade: 8,  posicao_principal: 'meia',     posicao_secundaria: 'atacante', posicao_terciaria: null },
  { nome: 'Rodrigo Muro',         fisico: 9, ataque: 3,  defesa: 10, tecnica: 4, tatica: 7, velocidade: 4,  posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Thiago Pedra',         fisico: 9, ataque: 2,  defesa: 9,  tecnica: 4, tatica: 6, velocidade: 3,  posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Anderson Rocha',       fisico: 8, ataque: 4,  defesa: 8,  tecnica: 5, tatica: 7, velocidade: 5,  posicao_principal: 'zagueiro', posicao_secundaria: 'meia',     posicao_terciaria: null },
  { nome: 'Felipe Ferro',         fisico: 8, ataque: 2,  defesa: 9,  tecnica: 3, tatica: 5, velocidade: 4,  posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Carlos Motor',         fisico: 6, ataque: 6,  defesa: 5,  tecnica: 7, tatica: 7, velocidade: 6,  posicao_principal: 'meia',     posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Diego Maestro',        fisico: 5, ataque: 6,  defesa: 5,  tecnica: 8, tatica: 8, velocidade: 6,  posicao_principal: 'meia',     posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Ricardo Campo',        fisico: 7, ataque: 5,  defesa: 6,  tecnica: 6, tatica: 7, velocidade: 5,  posicao_principal: 'meia',     posicao_secundaria: 'zagueiro', posicao_terciaria: null },
  { nome: 'Lucas Armador',        fisico: 5, ataque: 7,  defesa: 4,  tecnica: 7, tatica: 8, velocidade: 7,  posicao_principal: 'meia',     posicao_secundaria: 'atacante', posicao_terciaria: null },
  { nome: 'Marcos Combativo',     fisico: 7, ataque: 5,  defesa: 7,  tecnica: 5, tatica: 6, velocidade: 5,  posicao_principal: 'meia',     posicao_secundaria: 'zagueiro', posicao_terciaria: null },
  { nome: 'Rafael Meia',          fisico: 6, ataque: 6,  defesa: 6,  tecnica: 6, tatica: 6, velocidade: 6,  posicao_principal: 'meia',     posicao_secundaria: 'atacante', posicao_terciaria: 'zagueiro' },
  { nome: 'Gustavo Gol',          fisico: 6, ataque: 10, defesa: 2,  tecnica: 7, tatica: 4, velocidade: 6,  posicao_principal: 'atacante', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Henrique Artilheiro',  fisico: 5, ataque: 9,  defesa: 2,  tecnica: 8, tatica: 5, velocidade: 5,  posicao_principal: 'atacante', posicao_secundaria: 'meia',     posicao_terciaria: null },
  { nome: 'Paulo Chute',          fisico: 6, ataque: 9,  defesa: 2,  tecnica: 6, tatica: 4, velocidade: 7,  posicao_principal: 'atacante', posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Joãozinho Pipoca',     fisico: 3, ataque: 3,  defesa: 2,  tecnica: 3, tatica: 2, velocidade: 4,  posicao_principal: 'meia',     posicao_secundaria: null,       posicao_terciaria: null },
  { nome: 'Marquinhos Trôpego',   fisico: 2, ataque: 2,  defesa: 3,  tecnica: 2, tatica: 3, velocidade: 2,  posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null },
];

async function seed() {
  const [{ count }] = await query('SELECT COUNT(*)::int AS count FROM jogadores');
  if (count > 0) {
    console.log(`Banco já contém ${count} jogadores — seed ignorado.`);
    return;
  }

  for (const j of JOGADORES) {
    await query(
      `INSERT INTO jogadores
         (nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [j.nome, j.fisico, j.ataque, j.defesa, j.tecnica, j.tatica, j.velocidade,
       j.posicao_principal, j.posicao_secundaria, j.posicao_terciaria]
    );
  }

  console.log(`✓ Seed: ${JOGADORES.length} jogadores inseridos.`);
}

seed()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => pool.end());
