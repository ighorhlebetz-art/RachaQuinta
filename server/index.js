const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Arquivos estáticos
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Carrega rotas da API — falha aqui causa crash antes do listen
try {
  app.use('/api/jogadores', require('./routes/jogadores'));
  app.use('/api/rachas',    require('./routes/rachas'));
} catch (err) {
  console.error('[FATAL] Falha ao carregar rotas:', err);
  process.exit(1);
}

// Rota raiz explícita
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Fallback SPA — captura qualquer rota desconhecida e entrega o index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), err => {
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[OK] Quinta Categoria F.C. ouvindo em http://${HOST}:${PORT}`);
  console.log(`[OK] __dirname: ${__dirname}`);
  console.log(`[OK] public:    ${path.join(__dirname, '..', 'public')}`);
});
