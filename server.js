import 'dotenv/config';
import express from 'express';
import path from 'path';
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

// Statische Dateien wie index.html und bag-1.png aus dem Projektordner ausliefern
app.use(express.static(__dirname));

// Wichtig für Vercel: Startseite explizit ausliefern, sonst kommt manchmal "Cannot GET /"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback: alle normalen Seitenaufrufe auf index.html legen, API-Routen ausnehmen
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Lokal starten. Auf Vercel wird die Express-App exportiert.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Laminimas Custom Taschen Designer läuft auf http://localhost:${port}`);
  });
}

export default app;
