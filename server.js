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

const whatsappScript = `
<script data-laminimas-whatsapp-fix="8">
(function(){
  var WHATSAPP_NUMBER = '${WHATSAPP_NUMBER}';

  function byId(id){ return document.getElementById(id); }
  function text(id){ var el = byId(id); return el ? (el.textContent || el.value || '').trim() : ''; }
  function val(id){ var el = byId(id); return el ? (el.value || '').trim() : ''; }
  function generated(){ var img = document.querySelector('#resultBox img, .resultbox img'); return img ? img.src : ''; }

  function payload(){
    return {
      bagType: text('sumBag'),
      material: text('sumMaterial'),
      customText: val('customText') || text('sumText'),
      letterStyle: val('letterStyle') || text('sumLetterStyle'),
      letterPosition: val('letterPosition') || text('sumLetterPosition'),
      designWish: val('prompt'),
      generatedImage: generated()
    };
  }

  async function uploadImage(image){
    var res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: image })
    });

    var data = await res.json().catch(function(){ return {}; });

    if (!res.ok || !data.imageUrl) throw new Error(data.error || 'Bild-Link konnte nicht erstellt werden.');
    return data.imageUrl;
  }

  function whatsappUrl(p, imageLink){
    var msg =
      'Neue Custom-Taschen-Anfrage\n\n' +
      'Form: ' + (p.bagType || '-') + '\n' +
      'Material: ' + (p.material || '-') + '\n' +
      'Buchstaben/Wörter: ' + (p.customText || '-') + '\n' +
      'Text-Stil: ' + (p.letterStyle || '-') + '\n' +
      'Text-Position: ' + (p.letterPosition || '-') + '\n' +
      'Designwunsch: ' + (p.designWish || '-') + '\n\n' +
      'Bild-Link: ' + (imageLink || 'Cloudinary Upload fehlgeschlagen. Bitte Vorschau speichern und manuell schicken.');

    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  async function clickWhatsApp(e){
    if (e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    if (!WHATSAPP_NUMBER) { alert('WhatsApp-Nummer fehlt in Vercel: WHATSAPP_NUMBER'); return false; }
    var p = payload();
    if (!p.generatedImage) { alert('Bitte erst eine KI-Vorschau generieren.'); return false; }
    var btn = byId('buyBtn'); var oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Erstelle Bild-Link...'; }
    try { window.location.href = whatsappUrl(p, await uploadImage(p.generatedImage)); }
    catch (err) { alert((err && err.message ? err.message : 'Bild-Link konnte nicht erstellt werden.') + '\n\nWhatsApp wird ohne Bild-Link geöffnet. Speichere die Vorschau und sende das Bild manuell.'); window.location.href = whatsappUrl(p, ''); }
    finally { if (btn) { btn.disabled = false; btn.textContent = oldText || 'Per WhatsApp anfragen'; } }
    return false;
  }

  function replaceButton(){
    var old = byId('buyBtn');
    if (!old || old.getAttribute('data-wa-fixed') === '1') return;
    var clone = old.cloneNode(true);
    clone.id = 'buyBtn';
    clone.setAttribute('data-wa-fixed', '1');
    clone.textContent = 'Per WhatsApp anfragen';
    clone.onclick = clickWhatsApp;
    old.parentNode.replaceChild(clone, old);
  }

  function restoreGenerateFeedback(){
    var b = byId('generateBtn');
    if (!b || b.getAttribute('data-loading-fix') === '1') return;
    b.setAttribute('data-loading-fix','1');
    var original = b.textContent || 'KI-Vorschau generieren';
    document.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('#generateBtn') : null;
      if (!btn) return;
      setTimeout(function(){ if (btn.disabled) btn.textContent = '⏳ KI-Vorschau wird generiert...'; }, 30);
    }, true);
    setInterval(function(){
      var btn = byId('generateBtn');
      var status = text('sumStatus');
      if (!btn) return;
      if (!btn.disabled && (btn.textContent || '').indexOf('⏳') >= 0) btn.textContent = original;
      if (status === 'Vorschau erstellt' || status === 'Fehler') { if (!btn.disabled) btn.textContent = original; }
    }, 300);
  }

  document.addEventListener('DOMContentLoaded', function(){ replaceButton(); restoreGenerateFeedback(); });
  document.addEventListener('click', function(e){ var btn = e.target && e.target.closest ? e.target.closest('#buyBtn') : null; if (btn && btn.getAttribute('data-wa-fixed') === '1') clickWhatsApp(e); }, true);
  setInterval(function(){ replaceButton(); restoreGenerateFeedback(); }, 500);
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

  html = html.replace(/<script data-laminimas-whatsapp-fix="[\s\S]*?<\/script>/g, '');
  html = html.replace('</body>', whatsappScript + '</body>');
  return html;
}

function sendIndex(req, res) {
  const html = fixHtml(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.send(html);
}

app.get('/', sendIndex);
app.get('/index.html', sendIndex);
app.use(express.static(__dirname, { maxAge: 0 }));
app.get('*', (req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'API route not found' }) : sendIndex(req, res));

if (!process.env.VERCEL) app.listen(port, () => console.log(`Laminimas Custom Taschen Designer läuft auf http://localhost:${port}`));
export default app;
