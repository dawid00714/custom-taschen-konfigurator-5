export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Kein Bild empfangen.' });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return res.status(500).json({
        error: 'Cloudinary ist noch nicht eingerichtet. Fehlende ENV: CLOUDINARY_CLOUD_NAME oder CLOUDINARY_UPLOAD_PRESET.'
      });
    }

    const form = new FormData();
    form.append('file', image);
    form.append('upload_preset', uploadPreset);
    form.append('folder', 'laminimas-custom-taschen');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.secure_url) {
      return res.status(response.status || 500).json({
        error: data.error?.message || 'Bild konnte nicht zu Cloudinary hochgeladen werden.'
      });
    }

    return res.status(200).json({ imageUrl: data.secure_url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Upload fehlgeschlagen.' });
  }
}
