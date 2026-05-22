import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import generateHandler from './api/generate.js';
import inquiryHandler from './api/inquiry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));

app.post('/api/generate', (req, res) => generateHandler(req, res));
app.post('/api/inquiry', (req, res) => inquiryHandler(req, res));

function sendIndex(req, res) {
  const filePath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');

  html = html
    .replace(/ab\s*299\s*€/gi, 'Preis auf Anfrage')
    .replace(/ab\s*&nbsp;\s*299\s*€/gi, 'Preis auf Anfrage')
    .replace(/Auf Anfrage/gi, 'Preis auf Anfrage')
    .replace(/<div class="price">[\s\S]*?<\/div>/i, '<div class="price">Preis auf Anfrage</div>');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

app.get('/', sendIndex);
app.get('/index.html', sendIndex);

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  sendIndex(req, res);
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Laminimas Custom Taschen Designer läuft auf http://localhost:${port}`);
  });
}

export default app;
