# Laminimas Custom Taschen Designer

Lokale Nutzung:

```bash
npm install
cp .env.example .env
# .env mit neuem OPENROUTER_API_KEY und SMTP-Daten ausfüllen
npm run dev
```

Dann öffnen:

```txt
http://localhost:3000
```

Nicht per Doppelklick auf `index.html` öffnen, weil `/api/generate` und `/api/inquiry` sonst nicht erreichbar sind.

## Neu in dieser Version

- Besucher können Buchstaben, Initialen oder ganze Wörter eingeben.
- Buchstaben-Stil: Gold, Silber oder eingraviert/geprägt.
- Position: unten Mitte, Mitte oder oben Mitte.
- KI-Prompt erzwingt stärker, dass die generierte Tasche an der ausgewählten Silhouette/Form bleibt.
- Markenlogos und bekannte Monogramme wie GG, LV, CC, H, YSL, CD werden blockiert.
- Anfrage wird an info@laminimas.com gesendet, inklusive generiertem Bild als Anhang, wenn SMTP eingerichtet ist.

## ENV

```env
OPENROUTER_API_KEY=dein_neuer_key
OPENROUTER_MODEL=google/gemini-2.5-flash-image
SITE_URL=https://laminimas.com

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@laminimas.com
SMTP_PASS=dein_passwort_oder_app_passwort
MAIL_FROM=info@laminimas.com
```
