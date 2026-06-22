const express = require('express');
const router = express.Router();
const q = require('../db/queries/jogadores');

const POSICOES_VALIDAS = new Set(['zagueiro', 'meia', 'atacante', 'goleiro']);

function validarPosicao(val, campo) {
  if (!val || val === '') return null;
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

router.get('/', async (req, res) => {
  try {
    res.json(await q.listarJogadores());
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar jogadores.' });
  }
});

router.post('/', async (req, res) => {
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });

  const { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
          posicao_principal, posicao_secundaria, posicao_terciaria } = req.body;

  try {
    const jogador = await q.criarJogador({
      nome: nome.trim(),
      fisico: +fisico, ataque: +ataque, defesa: +defesa,
      tecnica: +tecnica, tatica: +tatica, velocidade: +velocidade,
      posicao_principal: posicao_principal || null,
      posicao_secundaria: posicao_secundaria || null,
      posicao_terciaria: posicao_terciaria || null,
    });
    res.status(201).json(jogador);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar jogador.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!await q.buscarJogador(req.params.id))
      return res.status(404).json({ erro: 'Jogador não encontrado.' });

    const erro = validar(req.body);
    if (erro) return res.status(400).json({ erro });

    const { nome, fisico, ataque, defesa, tecnica, tatica, velocidade,
            posicao_principal, posicao_secundaria, posicao_terciaria } = req.body;

    const jogador = await q.atualizarJogador(req.params.id, {
      nome: nome.trim(),
      fisico: +fisico, ataque: +ataque, defesa: +defesa,
      tecnica: +tecnica, tatica: +tatica, velocidade: +velocidade,
      posicao_principal: posicao_principal || null,
      posicao_secundaria: posicao_secundaria || null,
      posicao_terciaria: posicao_terciaria || null,
    });
    res.json(jogador);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar jogador.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!await q.buscarJogador(req.params.id))
      return res.status(404).json({ erro: 'Jogador não encontrado.' });

    if (await q.jogadorEmRacha(req.params.id))
      return res.status(400).json({ erro: 'Não é possível excluir este jogador pois ele está associado a um ou mais rachas.' });

    await q.deletarJogador(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir jogador.' });
  }
});

module.exports = router;
