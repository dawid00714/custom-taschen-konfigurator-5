// Endpoint: /api/inquiry
// Sendet die Custom-Taschen-Anfrage an info@laminimas.com.
// Dafür SMTP-Daten in .env / Vercel Environment Variables eintragen.

import nodemailer from 'nodemailer';

function dataUrlToAttachment(dataUrl, filename) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  if (dataUrl.startsWith('data:')) {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return null;
    return {
      filename,
      content: Buffer.from(match[2], 'base64'),
      contentType: match[1]
    };
  }

  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return { filename, path: dataUrl };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    return res.status(500).json({
      error: `E-Mail-Versand ist noch nicht eingerichtet. Fehlende ENV: ${missing.join(', ')}`
    });
  }

  try {
    const {
      bagType,
      material,
      background,
      customText,
      letterStyle,
      letterPosition,
      designWish,
      generatedImage,
      referenceImage
    } = req.body || {};

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const attachments = [];
    const generated = dataUrlToAttachment(generatedImage, 'ki-vorschau-custom-tasche.png');
    if (generated) attachments.push(generated);
    const reference = dataUrlToAttachment(referenceImage, 'inspirationsbild.png');
    if (reference) attachments.push(reference);

    const text = `Neue Custom-Taschen-Anfrage

Form: ${bagType || '-'}
Material: ${material || '-'}
Hintergrund: ${background || 'Komplett weißer Studio-Hintergrund'}
Buchstaben/Wörter: ${customText || '-'}
Buchstaben-Stil: ${letterStyle || '-'}
Buchstaben-Position: ${letterPosition || '-'}

Designwunsch:
${designWish || '-'}
`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: 'info@laminimas.com',
      subject: 'Neue Custom Tasche Anfrage',
      text,
      attachments
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'E-Mail konnte nicht gesendet werden.' });
  }
}
