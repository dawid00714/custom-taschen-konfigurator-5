import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import generateHandler from './api/generate.js';
import uploadImageHandler from './api/upload-image.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));
app.post('/api/generate', (req, res) => generateHandler(req, res));
app.post('/api/upload-image', (req, res) => uploadImageHandler(req, res));

app.use(express.static(__dirname, { maxAge: 0 }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

if (!process.env.VERCEL) app.listen(port, () => console.log(`Laminimas Custom Taschen Designer läuft auf http://localhost:${port}`));
export default app;
