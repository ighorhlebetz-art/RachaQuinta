const { query } = require('../pool');

async function listarJogadores() {
  return query('SELECT * FROM jogadores ORDER BY LOWER(nome)');
}

async function buscarJogador(id) {
  const rows = await query('SELECT * FROM jogadores WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function criarJogador({ nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
                              posicao_principal, posicao_secundaria, posicao_terciaria }) {
  const rows = await query(
    `INSERT INTO jogadores
       (nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
        posicao_principal, posicao_secundaria, posicao_terciaria)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
     posicao_principal ?? null, posicao_secundaria ?? null, posicao_terciaria ?? null]
  );
  return rows[0];
}

async function atualizarJogador(id, { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
                                      posicao_principal, posicao_secundaria, posicao_terciaria }) {
  const rows = await query(
    `UPDATE jogadores
     SET nome=$1, fisico=$2, ataque=$3, defesa=$4, tecnica=$5, tatica=$6, velocidade=$7,
         posicao_principal=$8, posicao_secundaria=$9, posicao_terciaria=$10
     WHERE id=$11
     RETURNING *`,
    [nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
     posicao_principal ?? null, posicao_secundaria ?? null, posicao_terciaria ?? null,
     id]
  );
  return rows[0] ?? null;
}

async function jogadorEmRacha(id) {
  const rows = await query(
    'SELECT racha_id FROM racha_jogadores WHERE jogador_id = $1 LIMIT 1',
    [id]
  );
  return rows[0] ?? null;
}

async function deletarJogador(id) {
  await query('DELETE FROM jogadores WHERE id = $1', [id]);
}

module.exports = { listarJogadores, buscarJogador, criarJogador, atualizarJogador, jogadorEmRacha, deletarJogador };
