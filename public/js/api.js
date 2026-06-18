// Wrapper de fetch para a API
const api = {
  async req(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  },
  jogadores: {
    listar: () => api.req('GET', '/api/jogadores'),
    criar: (body) => api.req('POST', '/api/jogadores', body),
    atualizar: (id, body) => api.req('PUT', `/api/jogadores/${id}`, body),
    excluir: (id) => api.req('DELETE', `/api/jogadores/${id}`),
  },
  rachas: {
    listar: () => api.req('GET', '/api/rachas'),
    obter: (id) => api.req('GET', `/api/rachas/${id}`),
    criar: (body) => api.req('POST', '/api/rachas', body),
    excluir: (id) => api.req('DELETE', `/api/rachas/${id}`),
    gerar: (id) => api.req('POST', `/api/rachas/${id}/gerar`),
  },
};
