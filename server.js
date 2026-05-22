import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import generateHandler from './api/generate.js';
import inquiryHandler from './api/inquiry.js';
import uploadImageHandler from './api/upload-image.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));

app.post('/api/generate', (req, res) => generateHandler(req, res));
app.post('/api/inquiry', (req, res) => inquiryHandler(req, res));
app.post('/api/upload-image', (req, res) => uploadImageHandler(req, res));

const RAW_BASE = 'https://raw.githubusercontent.com/dawid00714/custom-taschen-konfigurator-5/main';
const WHATSAPP_NUMBER = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');

const inquiryFixScript = `
<script data-laminimas-whatsapp-fix="3">
(function(){
  var WHATSAPP_NUMBER = '${WHATSAPP_NUMBER}';
  function text(id){ var el=document.getElementById(id); return el ? (el.textContent || el.value || '').trim() : ''; }
  function val(id){ var el=document.getElementById(id); return el ? (el.value || '').trim() : ''; }
  function generated(){ var img=document.querySelector('#resultBox img, .resultbox img'); return img ? img.src : ''; }
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
  async function uploadGeneratedImage(image){
    var res = await fetch('/api/upload-image', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ image:image })
    });
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok || !data.imageUrl) throw new Error(data.error || 'Bild-Link konnte nicht erstellt werden.');
    return data.imageUrl;
  }
  function makeWhatsAppUrl(payload, imageLink){
    var msg =
      'Neue Custom-Taschen-Anfrage\n\n' +
      'Form: ' + (payload.bagType || '-') + '\n' +
      'Material: ' + (payload.material || '-') + '\n' +
      'Buchstaben/Wörter: ' + (payload.customText || '-') + '\n' +
      'Text-Stil: ' + (payload.letterStyle || '-') + '\n' +
      'Text-Position: ' + (payload.letterPosition || '-') + '\n' +
      'Designwunsch: ' + (payload.designWish || '-') + '\n\n' +
      'Bild-Link: ' + (imageLink || payload.generatedImage || '-');
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  }
  function openWhatsApp(url){
    var a = document.getElementById('laminimasWhatsappLink');
    if (!a) {
      a = document.createElement('a');
      a.id = 'laminimasWhatsappLink';
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
    }
    a.href = url;
    a.click();
    setTimeout(function(){ window.location.href = url; }, 350);
  }
  async function sendInquiry(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('#buyBtn') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation && ev.stopImmediatePropagation();
    if (!WHATSAPP_NUMBER) { alert('WhatsApp-Nummer fehlt in Vercel: WHATSAPP_NUMBER'); return; }
    var payload = buildPayload();
    if (!payload.generatedImage) { alert('Bitte erst eine KI-Vorschau generieren.'); return; }
    var old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Erstelle Bild-Link...';
    try {
      var link = await uploadGeneratedImage(payload.generatedImage);
      openWhatsApp(makeWhatsAppUrl(payload, link));
    } catch(e) {
      alert((e && e.message ? e.message : 'Bild-Link konnte nicht erstellt werden.') + '\n\nWhatsApp wird trotzdem geöffnet.');
      openWhatsApp(makeWhatsAppUrl(payload, payload.generatedImage));
    } finally {
      btn.disabled = false;
      btn.textContent = old || 'Per WhatsApp anfragen';
    }
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

  html = html.replace(/<script data-laminimas-whatsapp-fix="[\s\S]*?<\/script>/, '');
  html = html.replace('</body>', inquiryFixScript + '</body>');
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
