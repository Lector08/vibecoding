const express = require('express');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/versions', (req, res) => {
  try {
    const nodeVersion = process.version;
    const npmVersion = execSync('npm --version').toString().trim();
    res.json({ node: nodeVersion, npm: npmVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущено: http://localhost:${PORT}`);
});
