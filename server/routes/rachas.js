const express = require('express');
const router = express.Router();
const q = require('../db/queries/rachas');
const { gerarTimes } = require('../balancer');

router.get('/', async (req, res) => {
  try {
    res.json(await q.listarRachas());
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar rachas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const racha = await q.buscarRacha(req.params.id);
    if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });

    const jogadores = await q.buscarJogadoresDeRacha(req.params.id);

    const goleiros = {};
    for (const [key, id] of [['a', racha.goleiro_a_id], ['b', racha.goleiro_b_id], ['c', racha.goleiro_c_id]]) {
      goleiros[key] = id ? await q.buscarGoleiro(id) : null;
    }

    res.json({
      ...racha,
      resultado: racha.resultado_json ?? null,  // JSONB já retorna objeto
      jogadores,
      goleiros,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar racha.' });
  }
});

router.post('/', async (req, res) => {
  try {
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

    const racha = await q.criarRacha({ nome: nome.trim(), data, goleiro_a_id: gIds[0], goleiro_b_id: gIds[1], goleiro_c_id: gIds[2] });
    await q.adicionarJogadoresARacha(racha.id, ids);

    res.status(201).json(racha);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar racha.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const racha = await q.buscarRacha(req.params.id);
    if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });
    await q.deletarRacha(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir racha.' });
  }
});

router.post('/:id/gerar', async (req, res) => {
  try {
    const racha = await q.buscarRacha(req.params.id);
    if (!racha) return res.status(404).json({ erro: 'Racha não encontrado.' });

    const jogadores = await q.buscarJogadoresDeRacha(req.params.id);
    if (jogadores.length !== 18)
      return res.status(400).json({ erro: `Racha precisa de 18 jogadores de linha (tem ${jogadores.length}).` });

    const goleiros = {};
    for (const [key, id] of [['a', racha.goleiro_a_id], ['b', racha.goleiro_b_id], ['c', racha.goleiro_c_id]]) {
      goleiros[key] = id ? await q.buscarGoleiro(id) : null;
    }

    let resultado;
    try {
      resultado = gerarTimes({ jogadores, goleiros });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }

    await q.salvarResultado(req.params.id, resultado);  // objeto JS direto — pg JSONB serializa
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar times.' });
  }
});

module.exports = router;
