export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Kein Bild empfangen.' });

    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || 'da5yesq5l').trim();
    const envPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
    const presets = [...new Set([envPreset, 'Laminimas-custom-Bags', 'laminimas_unsigned'].filter(Boolean))];

    let lastError = 'Bild konnte nicht zu Cloudinary hochgeladen werden.';

    for (const uploadPreset of presets) {
      const form = new FormData();
      form.append('file', image);
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

      lastError = data.error?.message || lastError;
    }

    return res.status(500).json({
      error: lastError + ' Prüfe in Cloudinary, ob der Upload Preset wirklich Unsigned ist.'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Upload fehlgeschlagen.' });
  }
}
