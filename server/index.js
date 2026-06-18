const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/jogadores', require('./routes/jogadores'));
app.use('/api/rachas', require('./routes/rachas'));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Quinta Categoria F.C. rodando em http://localhost:${PORT}`);
});
