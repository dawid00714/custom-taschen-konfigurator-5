function extractImageUrl(data) {
  const msg = data?.choices?.[0]?.message || {};
  const direct = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url || data?.images?.[0]?.url;
  if (direct) return direct;
  const content = msg?.content;
  if (Array.isArray(content)) {
    for (const p of content) {
      const u = p?.image_url?.url || p?.url || p?.image?.url;
      if (u) return u;
      if (p?.image_base64) return `data:image/png;base64,${p.image_base64}`;
    }
  }
  if (typeof content === 'string') {
    const dataUrl = content.match(/data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+/);
    if (dataUrl) return dataUrl[0];
    const url = content.match(/https?:\/\/\S+?\.(?:png|jpg|jpeg|webp)(?:\?\S*)?/i);
    if (url) return url[0];
  }
  return null;
}

const blockedMarks = ['GG', 'LV', 'CC', 'YSL', 'CD', 'GUCCI', 'VUITTON', 'CHANEL', 'HERMES', 'HERMÈS', 'DIOR'];
function cleanCustomText(value = '') {
  const cleaned = String(value).replace(/[^A-Za-zÀ-ž0-9 &+_.-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const normalized = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return blockedMarks.some(m => normalized === m || normalized.includes(m)) ? '' : cleaned;
}
function styleText(value) {
  return ({ none:'no letters or words', gold:'gold metal letters attached to the leather', silver:'silver metal letters attached to the leather', engraved:'engraved or embossed directly into the leather, tone-on-tone' })[value] || 'no letters or words';
}
function positionText(value) {
  return ({ bottom_center:'bottom center of the front panel', center:'center of the front panel', top_center:'top center of the front panel' })[value] || 'bottom center of the front panel';
}
async function callOpenRouter(payload) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'https://laminimas.com',
      'X-OpenRouter-Title': 'Laminimas Custom Taschen Designer'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `OpenRouter Fehler ${response.status}`);
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { bagType, silhouetteImage, prompt, material, referenceImage, letterStyle, letterPosition } = req.body || {};
    const customText = cleanCustomText(req.body?.customText);
    if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY fehlt.' });
    if (!silhouetteImage) return res.status(400).json({ error: 'Keine Taschen-Silhouette empfangen.' });

    const textInstruction = customText
      ? `Custom text requested: "${customText}". Text style: ${styleText(letterStyle)}. Text placement: ${positionText(letterPosition)}. Use it as original customer personalization, not as a brand logo.`
      : 'No custom letters or words selected. Do not add letters, initials, logos, or brand-like marks.';

    const promptText = `Create ONE realistic premium leather handbag product photo. Return an actual generated image, not only text.

Bag shape: ${bagType || 'handbag'}
Material: ${material || 'premium leather'}
Background: completely pure white seamless studio background.
Customer wishes: ${prompt || '-'}
${textInstruction}

Image roles:
- Image 1 is the strict bag shape / silhouette reference.
${referenceImage ? '- Image 2 is the style reference: copy color mood, leather finish, stitching, quilting, hardware tone and decorative style.' : ''}

Important:
- Preserve the outline, proportions, handle or strap placement and bag type from Image 1.
- Do not turn the selected silhouette into another bag shape.
- If Image 2 contains logos or brand marks, replace them with original unbranded design.
- No watermark.
- No protected brand logos.
- No famous monograms.
- The bag must look like real leather, not glass, plastic, metal or stone.`;

    const content = [{ type:'text', text:promptText }, { type:'image_url', image_url:{ url:silhouetteImage } }];
    if (referenceImage) content.push({ type:'image_url', image_url:{ url:referenceImage } });

    const model = process.env.OPENROUTER_MODEL || 'google/gemini-3-pro-image-preview';
    const payload = { model, messages:[{ role:'user', content }], modalities:['image','text'], image_config:{ aspect_ratio:'1:1', image_size:'1K' }, temperature:0.2, stream:false };
    let data = await callOpenRouter(payload);
    let imageUrl = extractImageUrl(data);

    if (!imageUrl && referenceImage) {
      const retryContent = [
        { type:'text', text: promptText + '\n\nSecond attempt: output the image now. Use Image 1 as style reference and Image 2 as shape reference.' },
        { type:'image_url', image_url:{ url:referenceImage } },
        { type:'image_url', image_url:{ url:silhouetteImage } }
      ];
      data = await callOpenRouter({ ...payload, messages:[{ role:'user', content:retryContent }] });
      imageUrl = extractImageUrl(data);
    }

    if (!imageUrl) return res.status(500).json({ error: `OpenRouter hat kein Bild zurückgegeben. Modell: ${model}. Referenzbild eventuell zu groß oder Modell antwortet bei zwei Bildern nur mit Text.` });
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('generate error:', error);
    return res.status(500).json({ error: error.message || 'Unbekannter Serverfehler' });
  }
}
