require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

app.use('/assets',  express.static(path.join(__dirname, '..', 'assets')));
app.use('/shared',  express.static(path.join(__dirname, '..', 'shared')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/jogadores', require('./routes/jogadores'));
app.use('/api/rachas',    require('./routes/rachas'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), err => {
    if (err) res.status(404).send('Not found');
  });
});

const { initSchema } = require('./db/schema');

initSchema()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`[OK] Quinta Categoria F.C. ouvindo em http://${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[FATAL] Falha ao inicializar banco:', err);
    process.exit(1);
  });
