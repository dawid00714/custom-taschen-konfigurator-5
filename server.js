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

const RAW_BASE = 'https://raw.githubusercontent.com/dawid00714/custom-taschen-konfigurator-5/main';
const WHATSAPP_NUMBER = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');

const inquiryFixScript = `
<script data-laminimas-whatsapp-fix="1">
(function(){
  var WHATSAPP_NUMBER = '${WHATSAPP_NUMBER}';
  function text(id){ var el=document.getElementById(id); return el ? (el.textContent || el.value || '').trim() : ''; }
  function val(id){ var el=document.getElementById(id); return el ? (el.value || '').trim() : ''; }
  function generated(){ var img=document.querySelector('#resultBox img, .resultbox img'); return img ? img.src : ''; }
  function downloadImage(url){
    try { var a=document.createElement('a'); a.href=url; a.download='custom-tasche-vorschau.png'; document.body.appendChild(a); a.click(); a.remove(); } catch(e) {}
  }
  function buildPayload(){
    return {
      bagType:text('sumBag'),
      material:text('sumMaterial'),
      customText:val('customText') || text('sumText'),
      letterStyle:val('letterStyle') || text('sumLetterStyle'),
      letterPosition:val('letterPosition') || text('sumLetterPosition'),
      designWish:val('prompt'),
      generatedImage:generated()
    };
  }
  function openWhatsApp(payload){
    if (!WHATSAPP_NUMBER) {
      alert('WhatsApp-Nummer ist noch nicht in Vercel gesetzt. Bitte Environment Variable WHATSAPP_NUMBER eintragen, z. B. 491701234567.');
      return;
    }
    if (payload.generatedImage) downloadImage(payload.generatedImage);
    var msg =
      'Neue Custom-Taschen-Anfrage%0A%0A' +
      'Form: ' + encodeURIComponent(payload.bagType || '-') + '%0A' +
      'Material: ' + encodeURIComponent(payload.material || '-') + '%0A' +
      'Buchstaben/Wörter: ' + encodeURIComponent(payload.customText || '-') + '%0A' +
      'Text-Stil: ' + encodeURIComponent(payload.letterStyle || '-') + '%0A' +
      'Text-Position: ' + encodeURIComponent(payload.letterPosition || '-') + '%0A' +
      'Designwunsch: ' + encodeURIComponent(payload.designWish || '-') + '%0A%0A' +
      'Das generierte Bild wurde heruntergeladen. Bitte bei WhatsApp als Bild mitschicken.';
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg, '_blank');
  }
  function sendInquiry(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('#buyBtn') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation && ev.stopImmediatePropagation();
    var payload = buildPayload();
    if (!payload.generatedImage) { alert('Bitte erst eine KI-Vorschau generieren.'); return; }
    openWhatsApp(payload);
  }
  document.addEventListener('click', sendInquiry, true);
})();
</script>
`;

function fixHtml(html) {
  html = html
    .replace(/ab\s*299\s*€/gi, 'Preis auf Anfrage')
    .replace(/ab\s*&nbsp;\s*299\s*€/gi, 'Preis auf Anfrage')
    .replace(/Auf Anfrage/gi, 'Preis auf Anfrage')
    .replace(/<div class="price">[\s\S]*?<\/div>/i, '<div class="price">Preis auf Anfrage</div>')
    .replace(/Design anfragen/g, 'Per WhatsApp anfragen')
    .replace(/bag-1\.png/g, `${RAW_BASE}/bag-1.png`)
    .replace(/bag-2\.png/g, `${RAW_BASE}/bag-2.png`)
    .replace(/bag-3\.png/g, `${RAW_BASE}/bag-3.png`)
    .replace(/bag-4\.png/g, `${RAW_BASE}/bag-4.png`)
    .replace(/bag-5\.png/g, `${RAW_BASE}/bag-5.png`);

  if (!html.includes('data-laminimas-whatsapp-fix')) {
    html = html.replace('</body>', inquiryFixScript + '</body>');
  }
  return html;
}

function sendIndex(req, res) {
  const filePath = path.join(__dirname, 'index.html');
  const html = fixHtml(fs.readFileSync(filePath, 'utf8'));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.send(html);
}

app.get('/', sendIndex);
app.get('/index.html', sendIndex);

app.use(express.static(__dirname, { maxAge: 0 }));

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
