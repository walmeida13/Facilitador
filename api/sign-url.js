// /api/sign-url.js
const { Storage } = require('@google-cloud/storage');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }

    const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
    if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY ausente');
    let credentials; try { credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch { credentials = JSON.parse(raw); }
    const projectId = credentials.project_id || process.env.GCP_PROJECT_ID;
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) throw new Error('GCS_BUCKET ausente');

    const chunks = []; for await (const ch of req) chunks.push(ch);
    const { filename, contentType } = JSON.parse(Buffer.concat(chunks).toString('utf8')) || {};
    if (!filename) return res.status(400).json({ error: 'filename obrigatório' });

    const storage = new Storage({ projectId, credentials });
    const key = `uploads/${Date.now()}-${filename}`;
    const file = storage.bucket(bucketName).file(key);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10 * 60 * 1000,
      contentType: contentType || 'application/octet-stream'
    });

    return res.status(200).json({ uploadUrl: url, gcsUri: `gs://${bucketName}/${key}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Falha ao gerar URL assinada', details: String(e?.message || e) });
  }
};
