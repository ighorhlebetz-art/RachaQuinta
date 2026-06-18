/* ===== app.js — Quinta Categoria F.C. ===== */

// Estado global mínimo
let todosJogadores = [];
let rachaAtualId = null;

// ===== UTILITÁRIOS =====

function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast${tipo === 'erro' ? ' erro' : ''}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function posLabel(pos) {
  return pos === 'zagueiro' ? 'ZAG' : pos === 'meia' ? 'MEI' : pos === 'atacante' ? 'ATA' : pos === 'goleiro' ? 'GK' : pos;
}

function posLabelCompleto(pos) {
  return pos === 'zagueiro' ? 'Zagueiro' : pos === 'meia' ? 'Meia' : pos === 'atacante' ? 'Atacante' : pos === 'goleiro' ? 'Goleiro' : pos;
}


function dataFormatada(str) {
  if (!str) return '';
  // str pode ser "2026-06-18" ou similar
  const [y, m, d] = str.split('-');
  if (!d) return str;
  return `${d}/${m}/${y}`;
}

// ===== NAVEGAÇÃO =====

function mostrarView(nome) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(`view-${nome}`);
  if (view) view.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-view="${nome}"]`);
  if (btn) btn.classList.add('active');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    mostrarView(view);
    if (view === 'jogadores') renderJogadores();
    if (view === 'historico') renderHistorico();
    if (view === 'novo-racha') iniciarNovoRacha();
  });
});

// ===== SLIDERS DE HABILIDADE =====

const SLIDER_IDS = ['fisico', 'ataque', 'defesa', 'tecnica', 'tatica', 'velocidade'];

// Fórmulas de força por posição (espelho do balancer.js)
const PESOS_POSICAO = {
  zagueiro: { fisico: 0.30, ataque: 0.05, defesa: 0.40, tecnica: 0.05, tatica: 0.20, velocidade: 0.00 },
  meia:     { fisico: 0.10, ataque: 0.20, defesa: 0.10, tecnica: 0.30, tatica: 0.30, velocidade: 0.00 },
  atacante: { fisico: 0.10, ataque: 0.35, defesa: 0.00, tecnica: 0.25, tatica: 0.10, velocidade: 0.20 },
};

const PESO_POSICAO_MANUAL = { principal: 1.0, secundaria: 0.75, terciaria: 0.5, fora: 0.3 };

function forcaEmPosicao(j, pos) {
  const p = PESOS_POSICAO[pos];
  return j.fisico * p.fisico + j.ataque * p.ataque + j.defesa * p.defesa +
         j.tecnica * p.tecnica + j.tatica * p.tatica + (j.velocidade || 5) * p.velocidade;
}

function pesoNaPosicao(j, pos) {
  if (!j.posicao_principal) return 1.0;
  if (pos === j.posicao_principal)  return PESO_POSICAO_MANUAL.principal;
  if (pos === j.posicao_secundaria) return PESO_POSICAO_MANUAL.secundaria;
  if (pos === j.posicao_terciaria)  return PESO_POSICAO_MANUAL.terciaria;
  return PESO_POSICAO_MANUAL.fora;
}

function calcularMelhorPosicao(j) {
  const posicoes = ['zagueiro', 'meia', 'atacante'];
  return posicoes.reduce((best, pos) =>
    forcaEmPosicao(j, pos) * pesoNaPosicao(j, pos) > forcaEmPosicao(j, best) * pesoNaPosicao(j, best) ? pos : best,
    posicoes[0]);
}

// ===== SELECTS DE POSIÇÃO (cascata) =====

function initPosicaoSelects() {
  const selPrincipal  = document.getElementById('posicao-principal');
  const selSecundaria = document.getElementById('posicao-secundaria');
  const selTerciaria  = document.getElementById('posicao-terciaria');

  function atualizarCascata() {
    const principal  = selPrincipal.value;
    const secundaria = selSecundaria.value;

    // Goleiro puro: sem posições secundárias/terciárias
    if (principal === 'goleiro') {
      selSecundaria.disabled = true;
      selSecundaria.value = '';
      selTerciaria.disabled = true;
      selTerciaria.value = '';
      return;
    }

    // Secundária: habilitar só se tiver principal
    selSecundaria.disabled = !principal;
    if (!principal) { selSecundaria.value = ''; selTerciaria.value = ''; }

    // Filtra opções da secundária (remove a principal)
    Array.from(selSecundaria.options).forEach(opt => {
      opt.hidden = opt.value !== '' && opt.value === principal;
    });
    if (selSecundaria.value === principal) selSecundaria.value = '';

    // Terciária: habilitar só se tiver secundária
    selTerciaria.disabled = !selSecundaria.value;
    if (!selSecundaria.value) selTerciaria.value = '';

    // Filtra opções da terciária (remove principal e secundária)
    Array.from(selTerciaria.options).forEach(opt => {
      opt.hidden = opt.value !== '' && (opt.value === principal || opt.value === selSecundaria.value);
    });
    if (selTerciaria.value === principal || selTerciaria.value === selSecundaria.value) selTerciaria.value = '';
  }

  selPrincipal.addEventListener('change', atualizarCascata);
  selSecundaria.addEventListener('change', atualizarCascata);
  atualizarCascata();
}

function setPosicaoValues(principal, secundaria, terciaria) {
  document.getElementById('posicao-principal').value  = principal  || '';
  document.getElementById('posicao-secundaria').value = secundaria || '';
  document.getElementById('posicao-terciaria').value  = terciaria  || '';
  // Disparar cascata
  document.getElementById('posicao-principal').dispatchEvent(new Event('change'));
  document.getElementById('posicao-secundaria').dispatchEvent(new Event('change'));
}

// Texto de posição para o card do jogador
function posTagDisplay(j) {
  if (!j.posicao_principal) {
    return `${posLabelCompleto(calcularMelhorPosicao(j))} <span class="posicao-auto-tag">auto</span>`;
  }
  let s = posLabelCompleto(j.posicao_principal);
  if (j.posicao_secundaria) s += ` <span class="posicao-sec-tag">/ ${posLabel(j.posicao_secundaria)}</span>`;
  if (j.posicao_terciaria)  s += ` <span class="posicao-sec-tag">/ ${posLabel(j.posicao_terciaria)}</span>`;
  return s;
}

// Label curto para a lista de seleção do racha
function posLabelSelecao(j) {
  if (j.posicao_principal === 'goleiro') return 'GK';
  if (!j.posicao_principal) return posLabel(calcularMelhorPosicao(j));
  let s = posLabel(j.posicao_principal);
  if (j.posicao_secundaria) s += `+${posLabel(j.posicao_secundaria)}`;
  if (j.posicao_terciaria)  s += `+${posLabel(j.posicao_terciaria)}`;
  return s;
}

function initSliders() {
  SLIDER_IDS.forEach(id => {
    const slider = document.getElementById(id);
    const display = document.getElementById(`${id}-display`);
    if (!slider || !display) return;
    display.textContent = slider.value;
    slider.oninput = () => { display.textContent = slider.value; };
  });
}

function setSliderValue(id, val) {
  const slider = document.getElementById(id);
  const display = document.getElementById(`${id}-display`);
  if (slider) slider.value = val;
  if (display) display.textContent = val;
}

// ===== JOGADORES =====

async function renderJogadores() {
  try {
    todosJogadores = await api.jogadores.listar();
  } catch (e) {
    toast('Erro ao carregar jogadores.', 'erro');
    return;
  }
  const lista = document.getElementById('lista-jogadores');
  if (todosJogadores.length === 0) {
    lista.innerHTML = `<div class="msg-vazio"><span>⚽</span>Nenhum jogador cadastrado. Clique em "+ Novo Jogador" para começar.</div>`;
    return;
  }
  lista.innerHTML = todosJogadores.map(j => `
    <div class="jogador-card">
      <div class="jogador-card-nome">${j.nome}</div>
      <div class="jogador-card-posicao">${posTagDisplay(j)}</div>
      <div class="jogador-card-notas">
        <span class="nota-item">💪 <strong>${j.fisico}</strong></span>
        <span class="nota-item">⚡ <strong>${j.ataque}</strong></span>
        <span class="nota-item">🛡 <strong>${j.defesa}</strong></span>
        <span class="nota-item">⚽ <strong>${j.tecnica}</strong></span>
        <span class="nota-item">🧠 <strong>${j.tatica}</strong></span>
        <span class="nota-item">⚡ vel <strong>${j.velocidade}</strong></span>
      </div>
      <div class="jogador-card-acoes">
        <button class="btn btn-sm btn-ghost btn-editar" data-id="${j.id}">✏ Editar</button>
        <button class="btn btn-sm btn-danger btn-excluir" data-id="${j.id}" data-nome="${j.nome}">🗑 Excluir</button>
      </div>
    </div>
  `).join('');

  lista.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => abrirFormEdicao(Number(btn.dataset.id)));
  });
  lista.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', () => excluirJogador(Number(btn.dataset.id), btn.dataset.nome));
  });
}

document.getElementById('btn-novo-jogador').addEventListener('click', () => {
  abrirFormCriacao();
});

function abrirFormCriacao() {
  const form = document.getElementById('form-jogador');
  form.reset();
  document.getElementById('jogador-id').value = '';
  document.getElementById('form-jogador-titulo').textContent = 'Novo Jogador';
  document.getElementById('btn-salvar-jogador').textContent = 'Salvar';
  SLIDER_IDS.forEach(id => setSliderValue(id, 5));
  setPosicaoValues('', '', '');
  initSliders();
  document.getElementById('form-jogador-container').classList.remove('hidden');
  document.getElementById('form-jogador-container').scrollIntoView({ behavior: 'smooth' });
}

function abrirFormEdicao(id) {
  const j = todosJogadores.find(x => x.id === id);
  if (!j) return;
  document.getElementById('jogador-id').value = j.id;
  document.getElementById('jogador-nome').value = j.nome;
  setSliderValue('fisico',     j.fisico);
  setSliderValue('ataque',     j.ataque);
  setSliderValue('defesa',     j.defesa);
  setSliderValue('tecnica',    j.tecnica);
  setSliderValue('tatica',     j.tatica);
  setSliderValue('velocidade', j.velocidade);
  setPosicaoValues(j.posicao_principal, j.posicao_secundaria, j.posicao_terciaria);
  document.getElementById('form-jogador-titulo').textContent = `Editar: ${j.nome}`;
  document.getElementById('btn-salvar-jogador').textContent = 'Atualizar';
  initSliders();
  document.getElementById('form-jogador-container').classList.remove('hidden');
  document.getElementById('form-jogador-container').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('btn-cancelar-jogador').addEventListener('click', () => {
  document.getElementById('form-jogador-container').classList.add('hidden');
});

document.getElementById('form-jogador').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('jogador-id').value;
  const payload = {
    nome:               document.getElementById('jogador-nome').value,
    fisico:             document.getElementById('fisico').value,
    ataque:             document.getElementById('ataque').value,
    defesa:             document.getElementById('defesa').value,
    tecnica:            document.getElementById('tecnica').value,
    tatica:             document.getElementById('tatica').value,
    velocidade:         document.getElementById('velocidade').value,
    posicao_principal:  document.getElementById('posicao-principal').value  || null,
    posicao_secundaria: document.getElementById('posicao-secundaria').value || null,
    posicao_terciaria:  document.getElementById('posicao-terciaria').value  || null,
  };
  try {
    if (id) {
      await api.jogadores.atualizar(id, payload);
      toast('Jogador atualizado!');
    } else {
      await api.jogadores.criar(payload);
      toast('Jogador criado!');
    }
    document.getElementById('form-jogador-container').classList.add('hidden');
    renderJogadores();
  } catch (err) {
    toast(err.message, 'erro');
  }
});

async function excluirJogador(id, nome) {
  if (!confirm(`Excluir jogador "${nome}"?`)) return;
  try {
    await api.jogadores.excluir(id);
    toast('Jogador excluído.');
    renderJogadores();
  } catch (err) {
    toast(err.message, 'erro');
  }
}

// ===== NOVO RACHA =====

let selecionados = new Set();

async function iniciarNovoRacha() {
  selecionados = new Set();
  document.getElementById('racha-nome').value = '';
  document.getElementById('racha-data').value = new Date().toISOString().slice(0, 10);

  try {
    todosJogadores = await api.jogadores.listar();
  } catch (e) {
    toast('Erro ao carregar jogadores.', 'erro');
    todosJogadores = [];
  }

  popularSelectsGoleiros();
  renderSelecaoJogadores();
}

function getGoleirosSelecionados() {
  return [
    Number(document.getElementById('goleiro-a').value),
    Number(document.getElementById('goleiro-b').value),
    Number(document.getElementById('goleiro-c').value),
  ].filter(Boolean);
}

function popularSelectsGoleiros() {
  const ids = ['goleiro-a', 'goleiro-b', 'goleiro-c'];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = '<option value="">Selecionar goleiro...</option>' +
      todosJogadores.map(j => `<option value="${j.id}">${j.nome}</option>`).join('');
    sel.value = current;
  });
}

['goleiro-a', 'goleiro-b', 'goleiro-c'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    renderSelecaoJogadores();
  });
});

function renderSelecaoJogadores() {
  const goleiroIds = getGoleirosSelecionados();
  const lista = document.getElementById('lista-selecao-jogadores');

  const jogadoresLinha = todosJogadores.filter(j => j.posicao_principal !== 'goleiro');
  // Limpa do set qualquer GK que tenha sido marcado anteriormente
  for (const j of todosJogadores) {
    if (j.posicao_principal === 'goleiro') selecionados.delete(j.id);
  }

  lista.innerHTML = jogadoresLinha.map(j => {
    const isGoleiro = goleiroIds.includes(j.id);
    const isSel = selecionados.has(j.id);
    return `
      <div class="selecao-item${isSel ? ' selecionado' : ''}${isGoleiro ? ' desabilitado' : ''}"
           data-id="${j.id}" title="${isGoleiro ? 'Jogador designado como goleiro' : ''}">
        <div class="selecao-check">${isSel ? '✓' : ''}</div>
        <span class="selecao-nome">${j.nome}</span>
        <span class="selecao-pos">${posLabelSelecao(j)}</span>
      </div>
    `;
  }).join('');

  lista.querySelectorAll('.selecao-item:not(.desabilitado)').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.id);
      if (selecionados.has(id)) {
        selecionados.delete(id);
      } else {
        if (selecionados.size >= 18) {
          toast('Máximo de 18 jogadores de linha atingido.', 'erro');
          return;
        }
        selecionados.add(id);
      }
      atualizarContador();
      renderSelecaoJogadores();
    });
  });

  atualizarContador();
}

function atualizarContador() {
  const el = document.getElementById('contador-jogadores');
  el.textContent = `${selecionados.size} / 18 selecionados`;
  el.classList.toggle('completo', selecionados.size === 18);
}

document.getElementById('form-racha').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('racha-nome').value.trim();
  const data = document.getElementById('racha-data').value;
  const gA = Number(document.getElementById('goleiro-a').value);
  const gB = Number(document.getElementById('goleiro-b').value);
  const gC = Number(document.getElementById('goleiro-c').value);

  if (selecionados.size !== 18) {
    toast(`Selecione exatamente 18 jogadores de linha (${selecionados.size} selecionados).`, 'erro');
    return;
  }
  if (!gA || !gB || !gC) {
    toast('Selecione um goleiro para cada time.', 'erro');
    return;
  }
  if (new Set([gA, gB, gC]).size !== 3) {
    toast('Os 3 goleiros devem ser jogadores distintos.', 'erro');
    return;
  }

  try {
    const racha = await api.rachas.criar({
      nome,
      data,
      goleiro_a_id: gA,
      goleiro_b_id: gB,
      goleiro_c_id: gC,
      jogadores_ids: [...selecionados],
    });

    toast('Racha criado! Gerando times...');
    const resultado = await api.rachas.gerar(racha.id);
    rachaAtualId = racha.id;
    mostrarResultado(racha, resultado);
  } catch (err) {
    toast(err.message, 'erro');
  }
});

// ===== HISTÓRICO =====

async function renderHistorico() {
  const lista = document.getElementById('lista-historico');
  let rachas;
  try {
    rachas = await api.rachas.listar();
  } catch (e) {
    lista.innerHTML = `<div class="msg-vazio"><span>❌</span>Erro ao carregar histórico.</div>`;
    return;
  }
  if (rachas.length === 0) {
    lista.innerHTML = `<div class="msg-vazio"><span>📋</span>Nenhum racha criado ainda.</div>`;
    return;
  }
  lista.innerHTML = `<div class="historico-lista">${rachas.map(r => `
    <div class="historico-item" data-id="${r.id}">
      <div class="historico-info">
        <div class="historico-nome">${r.nome}</div>
        <div class="historico-data">${dataFormatada(r.data)} · ${r.total_jogadores} jogadores</div>
      </div>
      <span class="badge ${r.tem_resultado ? 'badge-gerado' : 'badge-pendente'}">
        ${r.tem_resultado ? '✓ Times gerados' : '⏳ Pendente'}
      </span>
    </div>
  `).join('')}</div>`;

  lista.querySelectorAll('.historico-item').forEach(el => {
    el.addEventListener('click', () => abrirRacha(Number(el.dataset.id)));
  });
}

async function abrirRacha(id) {
  let dados;
  try {
    dados = await api.rachas.obter(id);
  } catch (e) {
    toast('Erro ao carregar racha.', 'erro');
    return;
  }
  rachaAtualId = id;

  if (dados.resultado) {
    mostrarResultado(dados, dados.resultado);
  } else {
    // Gera agora
    try {
      const resultado = await api.rachas.gerar(id);
      mostrarResultado(dados, resultado);
    } catch (err) {
      toast(err.message, 'erro');
    }
  }
}

// ===== RESULTADO =====

function mostrarResultado(racha, resultado) {
  document.getElementById('resultado-titulo').textContent = racha.nome;
  document.getElementById('resultado-subtitulo').textContent =
    `${dataFormatada(racha.data)} · Gerado em ${new Date(resultado.geradoEm).toLocaleString('pt-BR')}`;

  renderTimes(resultado.times);
  mostrarView('resultado');
  // Não muda a nav ativa — resultado é uma sub-view
}

function renderTimes(times) {
  const container = document.getElementById('times-container');
  container.innerHTML = times.map(time => {
    const jogPorPos = {
      zagueiro: time.jogadores.filter(j => j.posicao === 'zagueiro'),
      meia: time.jogadores.filter(j => j.posicao === 'meia'),
      atacante: time.jogadores.filter(j => j.posicao === 'atacante'),
    };

    const cabecalhoImagem = time.imagem
      ? `<img src="${time.imagem}" alt="Uniforme ${time.nome}" class="time-camisa">`
      : `<div class="time-camisa-placeholder">⚽</div>`;

    const posicoes = ['zagueiro', 'meia', 'atacante'];
    const posLabels = { zagueiro: 'Zagueiros', meia: 'Meias', atacante: 'Atacantes' };

    const gruposHTML = posicoes.map(pos => {
      const jogs = jogPorPos[pos] || [];
      if (jogs.length === 0) return '';
      return `
        <div class="posicao-grupo">
          <div class="posicao-label">${posLabels[pos]}</div>
          ${jogs.map(j => `
            <div class="jogador-linha">
              <span class="jogador-linha-nome">
                ${j.nome}
                ${j.foraDePosicao ? '<span class="fora-de-posicao-tag">fora pos.</span>' : ''}
              </span>
              <span class="jogador-linha-forca">${j.forca.toFixed(1)}</span>
            </div>
          `).join('')}
        </div>`;
    }).join('');

    return `
      <div class="time-card time-${time.id}">
        <div class="time-card-header">
          ${cabecalhoImagem}
          <div class="time-info-header">
            <div class="time-nome">${time.nome}</div>
            <div class="time-forca">Força total: ${time.forcaTotal.toFixed(1)}</div>
          </div>
        </div>
        <div class="time-card-body">
          <div class="goleiro-linha">
            <span class="goleiro-badge">GK</span>
            <span>${time.goleiro ? time.goleiro.nome : '—'}</span>
          </div>
          ${gruposHTML}
        </div>
        <div class="time-footer">
          <span>Consistência média: ${time.velocidadeMedia}</span>
          <span>${time.jogadores.length} jogadores de linha</span>
        </div>
      </div>`;
  }).join('');
}

document.getElementById('btn-regenerar').addEventListener('click', async () => {
  if (!rachaAtualId) return;
  try {
    toast('Regenerando times...');
    const resultado = await api.rachas.gerar(rachaAtualId);
    const racha = await api.rachas.obter(rachaAtualId);
    document.getElementById('resultado-subtitulo').textContent =
      `${dataFormatada(racha.data)} · Gerado em ${new Date(resultado.geradoEm).toLocaleString('pt-BR')}`;
    renderTimes(resultado.times);
    toast('Times regenerados!');
  } catch (err) {
    toast(err.message, 'erro');
  }
});

document.getElementById('btn-voltar-historico').addEventListener('click', () => {
  mostrarView('historico');
  document.querySelector('.nav-btn[data-view="historico"]').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.view !== 'historico') b.classList.remove('active');
  });
  renderHistorico();
});

// ===== INICIALIZAÇÃO =====
(async () => {
  initSliders();
  initPosicaoSelects();
  await renderJogadores();
})();
