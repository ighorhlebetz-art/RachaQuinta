// Balanceador de times — Quinta Categoria F.C.
// Geração de 3 times com formação 2 ZAG / 3 MEI / 1 ATA por time
// Algoritmo: fórmulas por atributos multidimensionais + pesos de posição manual + snake draft

const POSICOES = ['zagueiro', 'meia', 'atacante'];
const DEMANDA_TOTAL = { zagueiro: 6, meia: 9, atacante: 3 };

// Pesos dos atributos por posição
const PESOS = {
  zagueiro: { fisico: 0.30, ataque: 0.05, defesa: 0.40, tecnica: 0.05, tatica: 0.20, velocidade: 0.00 },
  meia:     { fisico: 0.10, ataque: 0.20, defesa: 0.10, tecnica: 0.30, tatica: 0.30, velocidade: 0.00 },
  atacante: { fisico: 0.10, ataque: 0.35, defesa: 0.00, tecnica: 0.25, tatica: 0.10, velocidade: 0.20 },
};

// Pesos de posição manual: principal > secundária > terciária > fora
const PESO_POSICAO_MANUAL = { principal: 1.0, secundaria: 0.75, terciaria: 0.5, fora: 0.3 };

// Força bruta por atributos (independe de posição manual)
function forcaNaPosicao(jogador, posicao) {
  const p = PESOS[posicao];
  return +(
    jogador.fisico     * p.fisico    +
    jogador.ataque     * p.ataque    +
    jogador.defesa     * p.defesa    +
    jogador.tecnica    * p.tecnica   +
    jogador.tatica     * p.tatica    +
    jogador.velocidade * p.velocidade
  ).toFixed(4);
}

// Retorna o peso manual do jogador para a posição dada
function pesoNaPosicao(jogador, posicao) {
  if (!jogador.posicao_principal) return 1.0; // sem preferência manual: sem penalidade
  if (posicao === jogador.posicao_principal)  return PESO_POSICAO_MANUAL.principal;
  if (posicao === jogador.posicao_secundaria) return PESO_POSICAO_MANUAL.secundaria;
  if (posicao === jogador.posicao_terciaria)  return PESO_POSICAO_MANUAL.terciaria;
  return PESO_POSICAO_MANUAL.fora;
}

// Força efetiva = força por atributos × peso da posição manual
function forcaEfetivaNaPosicao(jogador, posicao) {
  return +(forcaNaPosicao(jogador, posicao) * pesoNaPosicao(jogador, posicao)).toFixed(4);
}

// Melhor posição considerando força efetiva (respeita posições manuais)
function melhorPosicao(jogador) {
  return POSICOES.reduce((best, pos) =>
    forcaEfetivaNaPosicao(jogador, pos) > forcaEfetivaNaPosicao(jogador, best) ? pos : best
  , POSICOES[0]);
}

// Jogador está fora de posição quando a posição alocada não está na sua lista manual
function isForaDePosicao(jogador, posicaoAlocada) {
  if (!jogador.posicao_principal) return false; // sem preferência manual, nunca "fora"
  return posicaoAlocada !== jogador.posicao_principal &&
         posicaoAlocada !== jogador.posicao_secundaria &&
         posicaoAlocada !== jogador.posicao_terciaria;
}

// Embaralha elementos com a mesma força (quebra de empate aleatório)
function shuffleTiedGroups(arr, keyFn) {
  const result = [];
  let i = 0;
  while (i < arr.length) {
    let j = i + 1;
    while (j < arr.length && keyFn(arr[j]) === keyFn(arr[i])) j++;
    const group = arr.slice(i, j);
    for (let k = group.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [group[k], group[r]] = [group[r], group[k]];
    }
    result.push(...group);
    i = j;
  }
  return result;
}

// Fase A: alocar cada jogador em uma posição respeitando demanda 6/9/3
// Começa na melhor posição efetiva; excedentes são movidos com menor perda de força efetiva.
function alocarPosicoes(jogadores) {
  const alocados = jogadores.map(j => {
    const melhor = melhorPosicao(j);
    return {
      ...j,
      posicaoAlocada: melhor,
      forcaAlocada: forcaEfetivaNaPosicao(j, melhor),
      foraDePosicao: false,
    };
  });

  const contagem = { zagueiro: 0, meia: 0, atacante: 0 };
  for (const j of alocados) contagem[j.posicaoAlocada]++;

  let iteracoes = 0;
  while (iteracoes++ < 300) {
    const excedentes = POSICOES.filter(p => contagem[p] > DEMANDA_TOTAL[p]);
    const deficitarios = POSICOES.filter(p => contagem[p] < DEMANDA_TOTAL[p]);
    if (excedentes.length === 0) break;

    // Encontra a troca com menor perda de força efetiva
    let melhorTroca = null;
    for (const exc of excedentes) {
      for (const def of deficitarios) {
        for (const j of alocados.filter(x => x.posicaoAlocada === exc)) {
          const perda = j.forcaAlocada - forcaEfetivaNaPosicao(j, def);
          if (!melhorTroca || perda < melhorTroca.perda) {
            melhorTroca = { j, de: exc, para: def, perda };
          }
        }
      }
    }

    if (!melhorTroca) break;
    const { j, de, para } = melhorTroca;
    contagem[de]--;
    contagem[para]++;
    j.posicaoAlocada = para;
    j.forcaAlocada = forcaEfetivaNaPosicao(j, para);
    j.foraDePosicao = isForaDePosicao(j, para);
  }

  return alocados;
}

// Fase B: snake draft por posição
// Rotação aleatória do ponto de partida → resultados variados a cada "Regenerar",
// mas sem viés sistemático por time.
function snakeDraft(jogadoresPorPosicao) {
  const times = [[], [], []];
  const rotacao = Math.floor(Math.random() * 3);

  const patterns = {
    zagueiro: [0, 1, 2, 2, 1, 0],
    meia:     [0, 1, 2, 2, 1, 0, 0, 1, 2],
    atacante: [0, 1, 2],
  };

  for (const pos of POSICOES) {
    const grupo = [...jogadoresPorPosicao[pos]].sort((a, b) => {
      if (b.forcaAlocada !== a.forcaAlocada) return b.forcaAlocada - a.forcaAlocada;
      return b.velocidade - a.velocidade;
    });
    const grupoFinal = shuffleTiedGroups(grupo, j => j.forcaAlocada);
    const pattern = patterns[pos].map(idx => (idx + rotacao) % 3);
    for (let i = 0; i < grupoFinal.length; i++) {
      times[pattern[i]].push(grupoFinal[i]);
    }
  }

  return times;
}

function gerarTimes({ jogadores, goleiros }) {
  if (jogadores.length !== 18) {
    throw new Error(`Necessário exatamente 18 jogadores de linha, recebido ${jogadores.length}`);
  }

  const alocados = alocarPosicoes(jogadores);

  const porPosicao = { zagueiro: [], meia: [], atacante: [] };
  for (const j of alocados) porPosicao[j.posicaoAlocada].push(j);

  for (const pos of POSICOES) {
    if (porPosicao[pos].length !== DEMANDA_TOTAL[pos]) {
      console.warn(`Atenção: ${pos} tem ${porPosicao[pos].length} em vez de ${DEMANDA_TOTAL[pos]}`);
    }
  }

  const [jogadoresA, jogadoresB, jogadoresC] = snakeDraft(porPosicao);

  const CONFIGS = [
    { id: 'A', nome: 'Time Branco',  imagem: '/assets/time-branco.jpg' },
    { id: 'B', nome: 'Time Preto',   imagem: '/assets/time-preto.jpg'  },
    { id: 'C', nome: 'Time Dourado', imagem: null                       },
  ];

  const listas = [jogadoresA, jogadoresB, jogadoresC];
  const goleirosList = [goleiros.a, goleiros.b, goleiros.c];

  const times = CONFIGS.map((cfg, idx) => {
    const jogList = listas[idx];
    const forcaTotal = jogList.reduce((s, j) => s + j.forcaAlocada, 0);
    const velocidadeMedia = jogList.length
      ? +(jogList.reduce((s, j) => s + j.velocidade, 0) / jogList.length).toFixed(1)
      : 0;

    return {
      id: cfg.id,
      nome: cfg.nome,
      imagem: cfg.imagem,
      goleiro: goleirosList[idx]
        ? { id: goleirosList[idx].id, nome: goleirosList[idx].nome }
        : null,
      jogadores: jogList.map(j => ({
        id: j.id,
        nome: j.nome,
        posicao: j.posicaoAlocada,
        posicaoPrincipal: j.posicao_principal || null,
        forca: +j.forcaAlocada.toFixed(2),
        foraDePosicao: j.foraDePosicao,
      })),
      forcaTotal: +forcaTotal.toFixed(2),
      velocidadeMedia,
    };
  });

  return { geradoEm: new Date().toISOString(), times };
}

module.exports = { gerarTimes, forcaNaPosicao, forcaEfetivaNaPosicao, melhorPosicao, POSICOES };
