// Vercel / Node serverless endpoint: /api/generate
// Wichtig: API-Key NICHT hier eintragen. In Vercel oder lokal in .env speichern.

function extractImageUrl(data) {
  const message = data?.choices?.[0]?.message;
  return (
    message?.images?.[0]?.image_url?.url ||
    message?.images?.[0]?.imageUrl?.url ||
    message?.content?.find?.((p) => p?.type === 'image_url')?.image_url?.url ||
    null
  );
}

const blockedMarks = ['GG', 'LV', 'CC', 'H', 'YSL', 'CD', 'GUCCI', 'LOUIS VUITTON', 'VUITTON', 'CHANEL', 'HERMES', 'HERMÈS', 'DIOR'];
function cleanCustomText(value = '') {
  const cleaned = String(value)
    .replace(/[^A-Za-zÀ-ž0-9 &+_.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);

  const normalized = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const blocked = blockedMarks.some(mark => {
    const n = mark.replace(/[^A-Z0-9]/g, '');
    return normalized === n || normalized.includes(n);
  });

  return blocked ? '' : cleaned;
}

function styleText(value) {
  return ({
    none: 'no letters or words',
    gold: 'gold metal letters attached to the leather',
    silver: 'silver metal letters attached to the leather',
    engraved: 'engraved or embossed directly into the leather, tone-on-tone'
  })[value] || 'no letters or words';
}

function positionText(value) {
  return ({
    bottom_center: 'bottom center of the front panel',
    center: 'center of the front panel',
    top_center: 'top center of the front panel, below the handle or on the flap if suitable'
  })[value] || 'bottom center of the front panel';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bagType, silhouetteImage, prompt, material, referenceImage, letterStyle, letterPosition } = req.body || {};
    const customText = cleanCustomText(req.body?.customText);

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY fehlt. Lege lokal eine .env an oder trage die Variable bei Vercel ein.' });
    }
    if (!silhouetteImage) {
      return res.status(400).json({ error: 'Keine Taschen-Silhouette empfangen.' });
    }

    const textInstruction = customText
      ? `Custom text requested: "${customText}". Text style: ${styleText(letterStyle)}. Text placement: ${positionText(letterPosition)}. Use the text as original customer personalization only. Do not imitate any brand logo, trademark, or known monogram style.`
      : 'No custom letters or words selected. Do not add any letters, initials, logos, or brand-like marks.';

    const styleReferenceBlock = referenceImage
      ? `
STYLE REFERENCE PRIORITY:
- Image 2 is the main STYLE reference.
- Copy the visible aesthetic language from Image 2 as closely as possible: dominant color, leather finish, quilting or stitching direction, hardware color, glamour level, feminine/barbiecore mood, and overall luxury fashion feeling.
- Keep ONLY the style from Image 2, but DO NOT copy any brand logo, monogram, trademark symbol, or copyrighted brand mark visible in Image 2.
- If Image 2 shows a logo area, replace it with clean unbranded design or the requested custom text.
- Keep the background pure white even if Image 2 shows a colored or fluffy background.
`
      : `
No external style image was uploaded. Use the text description only.
`;

    const content = [
      {
        type: 'text',
        text:
`Create a realistic luxury product image of a custom handbag.
Selected bag shape: ${bagType || 'handbag'}.
Material: ${material || 'premium leather'}.
Background: completely pure white seamless studio background.
Customer wishes: ${prompt || 'If a style reference image is uploaded, follow it closely.'}
${textInstruction}

IMAGE ROLES:
- Image 1 = black silhouette shape reference.
${referenceImage ? '- Image 2 = handbag style reference.' : ''}

CRITICAL SHAPE RULES:
- The uploaded black silhouette is the main shape constraint.
- Preserve the exact overall silhouette, proportions, body outline, handle or strap placement, flap structure, and bag type from Image 1.
- Do not change the silhouette into a different bag type.
- Use the silhouette as a strict mask-like form reference, then add realistic leather texture and design details inside that form.
${styleReferenceBlock}
MATERIAL AND OUTPUT RULES:
- The final product must clearly look like a real leather handbag, not glass, resin, plastic, metal, or stone.
- The bag must look like a premium product photo.
- Use a clean pure white studio background only.
- No watermark.
- Do NOT generate trademark logos, brand signs, or famous monograms.
- Do NOT use or imitate Gucci GG, Louis Vuitton LV, Chanel CC, Hermès H, Dior CD, YSL, or any other protected brand identity.
- If custom text is requested, make it original, plain, and unbranded, using the selected style and position.
- When a style reference image is present, prioritize matching its style strongly while still obeying the silhouette from Image 1.`
      },
      { type: 'image_url', image_url: { url: silhouetteImage } }
    ];

    if (referenceImage) content.push({ type: 'image_url', image_url: { url: referenceImage } });

    const payload = {
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '1:1', image_size: '1K' },
      temperature: 0.2,
      stream: false
    };

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://laminimas.com',
        'X-OpenRouter-Title': 'Laminimas Custom Taschen Designer'
      },
      body: JSON.stringify(payload)
    });

    const data = await openRouterResponse.json().catch(() => ({}));

    if (!openRouterResponse.ok) {
      return res.status(openRouterResponse.status).json({
        error: data?.error?.message || data?.message || JSON.stringify(data) || `OpenRouter Fehler ${openRouterResponse.status}`
      });
    }

    const imageUrl = extractImageUrl(data);

    if (!imageUrl) {
      return res.status(500).json({
        error: 'OpenRouter hat kein Bild zurückgegeben. Prüfe, ob dein Modell Image-Output unterstützt und modalities korrekt sind.',
        raw: data
      });
    }

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unbekannter Serverfehler' });
  }
}
