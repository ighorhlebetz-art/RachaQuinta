const { query } = require('./pool');

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS jogadores (
      id                  SERIAL PRIMARY KEY,
      nome                TEXT NOT NULL,
      fisico              SMALLINT NOT NULL DEFAULT 5,
      ataque              SMALLINT NOT NULL DEFAULT 5,
      defesa              SMALLINT NOT NULL DEFAULT 5,
      tecnica             SMALLINT NOT NULL DEFAULT 5,
      tatica              SMALLINT NOT NULL DEFAULT 5,
      velocidade          SMALLINT NOT NULL DEFAULT 5,
      posicao_principal   TEXT,
      posicao_secundaria  TEXT,
      posicao_terciaria   TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rachas (
      id             SERIAL PRIMARY KEY,
      nome           TEXT NOT NULL,
      data           TEXT NOT NULL,
      goleiro_a_id   INTEGER REFERENCES jogadores(id),
      goleiro_b_id   INTEGER REFERENCES jogadores(id),
      goleiro_c_id   INTEGER REFERENCES jogadores(id),
      resultado_json JSONB,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS racha_jogadores (
      racha_id    INTEGER NOT NULL REFERENCES rachas(id) ON DELETE CASCADE,
      jogador_id  INTEGER NOT NULL REFERENCES jogadores(id),
      PRIMARY KEY (racha_id, jogador_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_jogadores_nome      ON jogadores (LOWER(nome))`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rachas_data          ON rachas (data DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rj_racha             ON racha_jogadores (racha_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rj_jogador           ON racha_jogadores (jogador_id)`);

  console.log('[db] Schema PostgreSQL inicializado.');
}

module.exports = { initSchema };
