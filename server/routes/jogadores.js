const express = require('express');
const router = express.Router();
const db = require('../db');

const POSICOES_VALIDAS = new Set(['zagueiro', 'meia', 'atacante', 'goleiro']);

function validarPosicao(val, campo) {
  if (!val || val === '') return null; // opcional: aceita vazio/null
  if (!POSICOES_VALIDAS.has(val)) return `${campo} deve ser "zagueiro", "meia", "atacante" ou "goleiro".`;
  return null;
}

function validar(body) {
  const { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria } = body;

  if (!nome || !nome.trim()) return 'Nome é obrigatório.';

  for (const [campo, val, min, max] of [
    ['fisico',     fisico,     0, 10],
    ['ataque',     ataque,     0, 10],
    ['defesa',     defesa,     0, 10],
    ['tecnica',    tecnica,    0, 10],
    ['tatica',     tatica,     0, 10],
    ['velocidade', velocidade, 1, 10],
  ]) {
    const n = Number(val);
    if (!Number.isInteger(n) || n < min || n > max)
      return `${campo} deve ser um inteiro entre ${min} e ${max}.`;
  }

  const erroPrincipal = validarPosicao(posicao_principal, 'posicao_principal');
  if (erroPrincipal) return erroPrincipal;

  if (!posicao_principal && (posicao_secundaria || posicao_terciaria))
    return 'Defina a posição principal antes de definir secundária ou terciária.';

  const erroSec = validarPosicao(posicao_secundaria, 'posicao_secundaria');
  if (erroSec) return erroSec;

  const erroTer = validarPosicao(posicao_terciaria, 'posicao_terciaria');
  if (erroTer) return erroTer;

  if (posicao_secundaria && posicao_secundaria === posicao_principal)
    return 'Posição secundária não pode ser igual à principal.';
  if (posicao_terciaria && posicao_terciaria === posicao_principal)
    return 'Posição terciária não pode ser igual à principal.';
  if (posicao_terciaria && posicao_terciaria === posicao_secundaria)
    return 'Posição terciária não pode ser igual à secundária.';
  if (posicao_terciaria && !posicao_secundaria)
    return 'Defina a posição secundária antes de definir a terciária.';

  return null;
}

router.get('/', (req, res) => {
  const jogadores = db.prepare('SELECT * FROM jogadores ORDER BY nome COLLATE NOCASE').all();
  res.json(jogadores);
});

router.post('/', (req, res) => {
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });

  const { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria } = req.body;

  const info = db.prepare(`
    INSERT INTO jogadores (nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
                           posicao_principal, posicao_secundaria, posicao_terciaria)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nome.trim(), +fisico, +ataque, +defesa, +tecnica, +tatica, +velocidade,
         posicao_principal || null, posicao_secundaria || null, posicao_terciaria || null);

  res.status(201).json(db.prepare('SELECT * FROM jogadores WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM jogadores WHERE id = ?').get(req.params.id))
    return res.status(404).json({ erro: 'Jogador não encontrado.' });

  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });

  const { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria } = req.body;

  db.prepare(`
    UPDATE jogadores
    SET nome=?, fisico=?, ataque=?, defesa=?, tecnica=?, tatica=?, velocidade=?,
        posicao_principal=?, posicao_secundaria=?, posicao_terciaria=?
    WHERE id=?
  `).run(nome.trim(), +fisico, +ataque, +defesa, +tecnica, +tatica, +velocidade,
         posicao_principal || null, posicao_secundaria || null, posicao_terciaria || null,
         req.params.id);

  res.json(db.prepare('SELECT * FROM jogadores WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM jogadores WHERE id = ?').get(req.params.id))
    return res.status(404).json({ erro: 'Jogador não encontrado.' });

  db.prepare('DELETE FROM jogadores WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
