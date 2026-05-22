export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Kein Bild empfangen.' });

    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || 'da5yesq5l').trim();
    const envPreset = String(process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();

    // Exakter Preset-Name aus deinem Cloudinary-Screenshot.
    const presets = [...new Set([envPreset, 'Laminimas-custom-Bags', 'Laminimas-cutom-Bags', 'laminimas_unsigned'].filter(Boolean))];

    let uploadFile = image;

    // Wenn OpenRouter ein Bild als URL zurückgibt, laden wir es serverseitig und schicken es als Data-URL zu Cloudinary.
    // Das ist stabiler als Cloudinary direkt die fremde URL holen zu lassen.
    if (/^https?:\/\//i.test(image)) {
      const imgRes = await fetch(image);
      if (!imgRes.ok) throw new Error(`Generiertes Bild konnte nicht geladen werden: ${imgRes.status}`);

      const contentType = imgRes.headers.get('content-type') || 'image/png';
      const arrayBuffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      uploadFile = `data:${contentType};base64,${base64}`;
    }

    const errors = [];

    for (const uploadPreset of presets) {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('upload_preset', uploadPreset);
      form.append('folder', 'laminimas-custom-taschen');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.secure_url) {
        return res.status(200).json({ imageUrl: data.secure_url, presetUsed: uploadPreset });
      }

      errors.push(`${uploadPreset}: ${data?.error?.message || response.status}`);
    }

    return res.status(500).json({
      error: `Cloudinary Upload fehlgeschlagen. Cloud name: ${cloudName}. Fehler: ${errors.join(' | ')}`
    });
  } catch (error) {
    console.error('upload-image error:', error);
    return res.status(500).json({ error: error.message || 'Upload fehlgeschlagen.' });
  }
}
