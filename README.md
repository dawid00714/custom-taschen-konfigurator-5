# Laminimas Custom Taschen Designer

Letztes Update: WhatsApp-Anfrage aktivieren.

Lokale Nutzung:

```bash
npm install
cp .env.example .env
npm run dev
```

Dann öffnen:

```txt
http://localhost:3000
```

Nicht per Doppelklick auf `index.html` öffnen, weil `/api/generate` sonst nicht erreichbar ist.

## ENV

```env
OPENROUTER_API_KEY=dein_neuer_key
OPENROUTER_MODEL=google/gemini-2.5-flash-image
SITE_URL=https://laminimas.com
WHATSAPP_NUMBER=4917629390147
CLOUDINARY_CLOUD_NAME=da5yesq5l
CLOUDINARY_UPLOAD_PRESET=laminimas_unsigned
```
