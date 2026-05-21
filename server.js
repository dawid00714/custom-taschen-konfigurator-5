import 'dotenv/config';
import express from 'express';
import generateHandler from './api/generate.js';
import inquiryHandler from './api/inquiry.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));
app.post('/api/generate', (req, res) => generateHandler(req, res));
app.post('/api/inquiry', (req, res) => inquiryHandler(req, res));
app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Laminimas Custom Taschen Designer läuft auf http://localhost:${port}`);
});
