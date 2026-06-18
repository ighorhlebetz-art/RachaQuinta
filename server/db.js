const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'rachas.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migrações por versão de schema
const version = db.pragma('user_version', { simple: true });

if (version < 2) {
  db.exec(`DROP TABLE IF EXISTS racha_jogadores; DROP TABLE IF EXISTS jogadores;`);
  db.pragma('user_version = 2');
}
if (version === 2) {
  // Renomeia consistencia → velocidade
  try { db.exec(`ALTER TABLE jogadores RENAME COLUMN consistencia TO velocidade;`); } catch(_) {}
  db.pragma('user_version = 3');
}
if (version < 4) {
  // Adiciona colunas de posição manual
  try { db.exec(`ALTER TABLE jogadores ADD COLUMN posicao_principal TEXT;`); } catch(_) {}
  try { db.exec(`ALTER TABLE jogadores ADD COLUMN posicao_secundaria TEXT;`); } catch(_) {}
  try { db.exec(`ALTER TABLE jogadores ADD COLUMN posicao_terciaria TEXT;`); } catch(_) {}
  db.pragma('user_version = 4');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS jogadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    fisico   INTEGER NOT NULL DEFAULT 5,
    ataque   INTEGER NOT NULL DEFAULT 5,
    defesa   INTEGER NOT NULL DEFAULT 5,
    tecnica  INTEGER NOT NULL DEFAULT 5,
    tatica   INTEGER NOT NULL DEFAULT 5,
    velocidade INTEGER NOT NULL DEFAULT 5,
    posicao_principal  TEXT,
    posicao_secundaria TEXT,
    posicao_terciaria  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS rachas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    data TEXT NOT NULL,
    goleiro_a_id INTEGER,
    goleiro_b_id INTEGER,
    goleiro_c_id INTEGER,
    resultado_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (goleiro_a_id) REFERENCES jogadores(id),
    FOREIGN KEY (goleiro_b_id) REFERENCES jogadores(id),
    FOREIGN KEY (goleiro_c_id) REFERENCES jogadores(id)
  );

  CREATE TABLE IF NOT EXISTS racha_jogadores (
    racha_id INTEGER NOT NULL,
    jogador_id INTEGER NOT NULL,
    PRIMARY KEY (racha_id, jogador_id),
    FOREIGN KEY (racha_id) REFERENCES rachas(id) ON DELETE CASCADE,
    FOREIGN KEY (jogador_id) REFERENCES jogadores(id)
  );
`);

// Seed de desenvolvimento: insere 18 jogadores fictícios se o banco estiver vazio
const totalJogadores = db.prepare('SELECT COUNT(*) AS n FROM jogadores').get().n;
if (totalJogadores === 0) {
  const insert = db.prepare(`
    INSERT INTO jogadores (nome, fisico, ataque, defesa, tecnica, tatica, velocidade, posicao_principal, posicao_secundaria, posicao_terciaria)
    VALUES (@nome, @fisico, @ataque, @defesa, @tecnica, @tatica, @velocidade, @posicao_principal, @posicao_secundaria, @posicao_terciaria)
  `);

  const seed = db.transaction(() => {
    // Rápidos / atacantes com velocidade (3)
    insert.run({ nome: 'Léo Relâmpago',   fisico: 6, ataque: 7,  defesa: 3, tecnica: 6, tatica: 5, velocidade: 10, posicao_principal: 'atacante',  posicao_secundaria: 'meia',     posicao_terciaria: null });
    insert.run({ nome: 'Caio Flash',       fisico: 5, ataque: 8,  defesa: 2, tecnica: 5, tatica: 4, velocidade:  9, posicao_principal: 'atacante',  posicao_secundaria: null,       posicao_terciaria: null });
    insert.run({ nome: 'Bruno Foguete',    fisico: 6, ataque: 6,  defesa: 3, tecnica: 5, tatica: 5, velocidade:  8, posicao_principal: 'meia',      posicao_secundaria: 'atacante', posicao_terciaria: null });

    // Zagueiros (4)
    insert.run({ nome: 'Rodrigo Muro',     fisico: 9, ataque: 3,  defesa: 10, tecnica: 4, tatica: 7, velocidade: 4, posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null });
    insert.run({ nome: 'Thiago Pedra',     fisico: 9, ataque: 2,  defesa:  9, tecnica: 4, tatica: 6, velocidade: 3, posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null });
    insert.run({ nome: 'Anderson Rocha',   fisico: 8, ataque: 4,  defesa:  8, tecnica: 5, tatica: 7, velocidade: 5, posicao_principal: 'zagueiro', posicao_secundaria: 'meia',     posicao_terciaria: null });
    insert.run({ nome: 'Felipe Ferro',     fisico: 8, ataque: 2,  defesa:  9, tecnica: 3, tatica: 5, velocidade: 4, posicao_principal: 'zagueiro', posicao_secundaria: null,       posicao_terciaria: null });

    // Meio-campistas equilibrados (6)
    insert.run({ nome: 'Carlos Motor',     fisico: 6, ataque: 6,  defesa: 5, tecnica: 7, tatica: 7, velocidade: 6, posicao_principal: 'meia',     posicao_secundaria: null,       posicao_terciaria: null });
    insert.run({ nome: 'Diego Maestro',    fisico: 5, ataque: 6,  defesa: 5, tecnica: 8, tatica: 8, velocidade: 6, posicao_principal: 'meia',     posicao_secundaria: null,       posicao_terciaria: null });
    insert.run({ nome: 'Ricardo Campo',    fisico: 7, ataque: 5,  defesa: 6, tecnica: 6, tatica: 7, velocidade: 5, posicao_principal: 'meia',     posicao_secundaria: 'zagueiro', posicao_terciaria: null });
    insert.run({ nome: 'Lucas Armador',    fisico: 5, ataque: 7,  defesa: 4, tecnica: 7, tatica: 8, velocidade: 7, posicao_principal: 'meia',     posicao_secundaria: 'atacante', posicao_terciaria: null });
    insert.run({ nome: 'Marcos Combativo', fisico: 7, ataque: 5,  defesa: 7, tecnica: 5, tatica: 6, velocidade: 5, posicao_principal: 'meia',     posicao_secundaria: 'zagueiro', posicao_terciaria: null });
    insert.run({ nome: 'Rafael Meia',      fisico: 6, ataque: 6,  defesa: 6, tecnica: 6, tatica: 6, velocidade: 6, posicao_principal: 'meia',     posicao_secundaria: 'atacante', posicao_terciaria: 'zagueiro' });

    // Atacantes finalizadores (3)
    insert.run({ nome: 'Gustavo Gol',         fisico: 6, ataque: 10, defesa: 2, tecnica: 7, tatica: 4, velocidade: 6, posicao_principal: 'atacante', posicao_secundaria: null,   posicao_terciaria: null });
    insert.run({ nome: 'Henrique Artilheiro', fisico: 5, ataque: 9,  defesa: 2, tecnica: 8, tatica: 5, velocidade: 5, posicao_principal: 'atacante', posicao_secundaria: 'meia', posicao_terciaria: null });
    insert.run({ nome: 'Paulo Chute',         fisico: 6, ataque: 9,  defesa: 2, tecnica: 6, tatica: 4, velocidade: 7, posicao_principal: 'atacante', posicao_secundaria: null,   posicao_terciaria: null });

    // Fracos (2)
    insert.run({ nome: 'Joãozinho Pipoca',    fisico: 3, ataque: 3, defesa: 2, tecnica: 3, tatica: 2, velocidade: 4, posicao_principal: 'meia',     posicao_secundaria: null, posicao_terciaria: null });
    insert.run({ nome: 'Marquinhos Trôpego',  fisico: 2, ataque: 2, defesa: 3, tecnica: 2, tatica: 3, velocidade: 2, posicao_principal: 'zagueiro', posicao_secundaria: null, posicao_terciaria: null });
  });

  seed();
  console.log('[db] Seed: 18 jogadores fictícios inseridos.');
}

module.exports = db;
