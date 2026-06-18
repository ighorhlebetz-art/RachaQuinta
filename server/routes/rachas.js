const express = require('express');
const router = express.Router();
const db = require('../db');
const { gerarTimes } = require('../balancer');

// Lista de rachas (resumo)
router.get('/', (req, res) => {
  const rachas = db.prepare(`
    SELECT r.id, r.nome, r.data, r.created_at,
           r.resultado_json IS NOT NULL AS tem_resultado,
           COUNT(rj.jogador_id) AS total_jogadores
    FROM rachas r
    LEFT JOIN racha_jogadores rj ON rj.racha_id = r.id
    GROUP BY r.id
    ORDER BY r.data DESC, r.created_at DESC
  `).all();
  res.json(rachas);
});

// Detalhe de um racha
router.get('/:id', (req, res) => {
  const racha = db.prepare('SELECT * FROM rachas WHERE id = ?').get(req.params.id);
  if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });

  const jogadores = db.prepare(`
    SELECT j.* FROM jogadores j
    INNER JOIN racha_jogadores rj ON rj.jogador_id = j.id
    WHERE rj.racha_id = ?
    ORDER BY j.nome COLLATE NOCASE
  `).all(req.params.id);

  const goleiros = {};
  for (const [key, id] of [['a', racha.goleiro_a_id], ['b', racha.goleiro_b_id], ['c', racha.goleiro_c_id]]) {
    goleiros[key] = id ? db.prepare('SELECT id, nome FROM jogadores WHERE id = ?').get(id) : null;
  }

  res.json({
    ...racha,
    resultado: racha.resultado_json ? JSON.parse(racha.resultado_json) : null,
    jogadores,
    goleiros,
  });
});

// Criar racha
router.post('/', (req, res) => {
  const { nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id, jogadores_ids } = req.body;

  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'Nome do racha é obrigatório.' });
  if (!data) return res.status(400).json({ erro: 'Data é obrigatória.' });

  const ids = Array.isArray(jogadores_ids) ? jogadores_ids.map(Number) : [];
  if (ids.length !== 18) return res.status(400).json({ erro: `Selecione exatamente 18 jogadores de linha (selecionado: ${ids.length}).` });

  const gIds = [Number(goleiro_a_id), Number(goleiro_b_id), Number(goleiro_c_id)];
  if (gIds.some(isNaN) || gIds.some(id => !id)) return res.status(400).json({ erro: 'Selecione um goleiro para cada time.' });

  for (const gId of gIds) {
    if (ids.includes(gId)) return res.status(400).json({ erro: 'Um goleiro não pode estar na lista de jogadores de linha.' });
  }

  const info = db.prepare(`
    INSERT INTO rachas (nome, data, goleiro_a_id, goleiro_b_id, goleiro_c_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(nome.trim(), data, gIds[0], gIds[1], gIds[2]);

  const rachaId = info.lastInsertRowid;
  const insStmt = db.prepare('INSERT INTO racha_jogadores (racha_id, jogador_id) VALUES (?, ?)');
  const insertMany = db.transaction((ids) => {
    for (const id of ids) insStmt.run(rachaId, id);
  });
  insertMany(ids);

  const racha = db.prepare('SELECT * FROM rachas WHERE id = ?').get(rachaId);
  res.status(201).json(racha);
});

// Deletar racha
router.delete('/:id', (req, res) => {
  const racha = db.prepare('SELECT id FROM rachas WHERE id = ?').get(req.params.id);
  if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });
  db.prepare('DELETE FROM racha_jogadores WHERE racha_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rachas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Gerar / Regenerar times
router.post('/:id/gerar', (req, res) => {
  const racha = db.prepare('SELECT * FROM rachas WHERE id = ?').get(req.params.id);
  if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });

  const jogadores = db.prepare(`
    SELECT j.* FROM jogadores j
    INNER JOIN racha_jogadores rj ON rj.jogador_id = j.id
    WHERE rj.racha_id = ?
  `).all(req.params.id);

  if (jogadores.length !== 18) {
    return res.status(400).json({ erro: `Racha precisa de 18 jogadores de linha (tem ${jogadores.length}).` });
  }

  const goleiros = {};
  for (const [key, id] of [['a', racha.goleiro_a_id], ['b', racha.goleiro_b_id], ['c', racha.goleiro_c_id]]) {
    goleiros[key] = id ? db.prepare('SELECT id, nome FROM jogadores WHERE id = ?').get(id) : null;
  }

  let resultado;
  try {
    resultado = gerarTimes({ jogadores, goleiros });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }

  db.prepare('UPDATE rachas SET resultado_json = ? WHERE id = ?')
    .run(JSON.stringify(resultado), req.params.id);

  res.json(resultado);
});

module.exports = router;
