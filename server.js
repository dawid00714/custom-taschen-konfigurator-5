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

const inquiryFixScript = `
<script>
(function(){
  function text(id){ var el=document.getElementById(id); return el ? (el.textContent || el.value || '').trim() : ''; }
  function val(id){ var el=document.getElementById(id); return el ? (el.value || '').trim() : ''; }
  function generated(){ var img=document.querySelector('#resultBox img, .resultbox img'); return img ? img.src : ''; }
  function downloadImage(url){
    try { var a=document.createElement('a'); a.href=url; a.download='custom-tasche-vorschau.png'; document.body.appendChild(a); a.click(); a.remove(); } catch(e) {}
  }
  function openMail(payload){
    if (payload.generatedImage) downloadImage(payload.generatedImage);
    var subject = encodeURIComponent('Custom Tasche Anfrage');
    var body = encodeURIComponent(
      'Hallo, ich möchte diese Custom Tasche anfragen.\n\n' +
      'Form: ' + (payload.bagType || '-') + '\n' +
      'Material: ' + (payload.material || '-') + '\n' +
      'Buchstaben/Wörter: ' + (payload.customText || '-') + '\n' +
      'Text-Stil: ' + (payload.letterStyle || '-') + '\n' +
      'Text-Position: ' + (payload.letterPosition || '-') + '\n' +
      'Designwunsch: ' + (payload.designWish || '-') + '\n\n' +
      'Das generierte Bild wurde heruntergeladen. Bitte als Anhang hinzufügen, falls es nicht automatisch mitgesendet wurde.'
    );
    window.open('mailto:info@laminimas.com?subject=' + subject + '&body=' + body, '_top');
  }
  async function sendInquiry(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('#buyBtn') : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation && ev.stopImmediatePropagation();
    var image = generated();
    if (!image) { alert('Bitte erst eine KI-Vorschau generieren.'); return; }
    var payload = {
      to:'info@laminimas.com',
      bagType:text('sumBag'),
      material:text('sumMaterial'),
      background:'Komplett weißer Studio-Hintergrund',
      customText:val('customText') || text('sumText'),
      letterStyle:val('letterStyle') || text('sumLetterStyle'),
      letterPosition:val('letterPosition') || text('sumLetterPosition'),
      designWish:val('prompt'),
      generatedImage:image,
      referenceImage:''
    };
    var old = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sende Anfrage...';
    try {
      var res = await fetch('/api/inquiry', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      var data = await res.json().catch(function(){ return {}; });
      if (!res.ok) throw new Error(data.error || 'E-Mail-Versand nicht eingerichtet');
      alert('Anfrage wurde an info@laminimas.com gesendet. Das generierte Bild wurde als Anhang mitgesendet.');
    } catch(e) {
      openMail(payload);
    } finally {
      btn.disabled = false; btn.textContent = old || 'Design anfragen';
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
    .replace(/bag-1\.png/g, `${RAW_BASE}/bag-1.png`)
    .replace(/bag-2\.png/g, `${RAW_BASE}/bag-2.png`)
    .replace(/bag-3\.png/g, `${RAW_BASE}/bag-3.png`)
    .replace(/bag-4\.png/g, `${RAW_BASE}/bag-4.png`)
    .replace(/bag-5\.png/g, `${RAW_BASE}/bag-5.png`);

  if (!html.includes('Fix inquiry button with email fallback')) {
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
