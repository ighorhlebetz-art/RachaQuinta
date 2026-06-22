const { query, pool } = require('../pool');

async function listarRachas() {
  return query(`
    SELECT r.id, r.nome, r.data, r.created_at,
           (r.resultado_json IS NOT NULL) AS tem_resultado,
           COUNT(rj.jogador_id)::int      AS total_jogadores
    FROM rachas r
    LEFT JOIN racha_jogadores rj ON rj.racha_id = r.id
    GROUP BY r.id
    ORDER BY r.data DESC, r.created_at DESC
  `);
}

async function buscarRacha(id) {
  const rows = await query('SELECT * FROM rachas WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function buscarJogadoresDeRacha(rachaId) {
  return query(
    `SELECT j.* FROM jogadores j
     INNER JOIN racha_jogadores rj ON rj.jogador_id = j.id
     WHERE rj.racha_id = $1
     ORDER BY LOWER(j.nome)`,
    [rachaId]
  );
}

async function buscarGoleiro(id) {
  const rows = await query('SELECT id, nome FROM jogadores WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function criarRacha({ nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id }) {
  const rows = await query(
    `INSERT INTO rachas (nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id]
  );
  return rows[0];
}

async function adicionarJogadoresARacha(rachaId, jogadorIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const jogadorId of jogadorIds) {
      await client.query(
        'INSERT INTO racha_jogadores (racha_id, jogador_id) VALUES ($1,$2)',
        [rachaId, jogadorId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function salvarResultado(rachaId, resultado) {
  await query(
    'UPDATE rachas SET resultado_json = $1 WHERE id = $2',
    [resultado, rachaId]
  );
}

async function deletarRacha(id) {
  // racha_jogadores é removido automaticamente via ON DELETE CASCADE
  await query('DELETE FROM rachas WHERE id = $1', [id]);
}

module.exports = {
  listarRachas, buscarRacha, buscarJogadoresDeRacha, buscarGoleiro,
  criarRacha, adicionarJogadoresARacha, salvarResultado, deletarRacha,
};
