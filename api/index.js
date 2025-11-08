// /api/index.js
const Busboy = require('busboy');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const TurndownService = require('turndown');
const vision = require('@google-cloud/vision');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const path = require('path');

module.exports.config = { api: { bodyParser: false } };

function getGcp() {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY ausente');
  let credentials;
  try { credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  catch { credentials = JSON.parse(raw); }
  const projectId = credentials.project_id || process.env.GCP_PROJECT_ID;
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) throw new Error('GCS_BUCKET ausente');
  return {
    visionClient: new vision.ImageAnnotatorClient({ projectId, credentials }),
    storage: new Storage({ projectId, credentials }),
    bucketName
  };
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let buffer = null, filename = null, mime = null;
    bb.on('file', (_n, file, info) => {
      filename = info.filename || 'upload';
      mime = info.mimeType || 'application/octet-stream';
      const chunks = [];
      file.on('data', d => chunks.push(d));
      file.on('end', () => (buffer = Buffer.concat(chunks)));
    });
    bb.on('error', reject);
    bb.on('finish', () => buffer ? resolve({ buffer, filename, mime }) : reject(new Error('Nenhum arquivo enviado')));
    req.pipe(bb);
  });
}

async function docxToMd(buf) {
  const { value } = await mammoth.convertToHtml({ buffer: buf });
  const td = new TurndownService({ headingStyle: 'atx' });
  return td.turndown(value);
}
async function pdfText(buf) { const d = await pdfParse(buf); return (d.text || '').trim(); }
function toMd(t) {
  if (!t) return '';
  return t.replace(/\u2022|\u25CF|\u25A0/g, '•').replace(/^\s*•\s*/gm, '- ')
          .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

async function ocrImage(visionClient, buf) {
  const [r] = await visionClient.documentTextDetection({ image: { content: buf } });
  return (r?.fullTextAnnotation?.text || '').trim();
}

async function ocrPdfFromGcs(visionClient, storage, bucketName, gcsUri) {
  const outPrefix = `ocr/${crypto.randomUUID()}/`;
  const [op] = await visionClient.asyncBatchAnnotateFiles({
    requests: [{
      inputConfig: { gcsSource: { uri: gcsUri }, mimeType: 'application/pdf' },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      outputConfig: { gcsDestination: { uri: `gs://${bucketName}/${outPrefix}` }, batchSize: 2 }
    }]
  });
  await op.promise();
  const bucket = storage.bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix: outPrefix });
  files.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  const pages = [];
  for (const f of files) {
    const [c] = await f.download();
    const json = JSON.parse(c.toString('utf8'));
    for (const r of json.responses || []) {
      const t = r.fullTextAnnotation?.text?.trim();
      if (t) pages.push(toMd(t));
    }
  }
  return pages.join('\n\n---\n\n');
}

async function ocrPdfFromBuffer(visionClient, storage, bucketName, buf, filename) {
  // envia o PDF para GCS e reaproveita a função acima
  const bucket = storage.bucket(bucketName);
  const key = `uploads/${crypto.randomUUID()}/${filename || 'file.pdf'}`;
  await bucket.file(key).save(buf, { resumable: false, contentType: 'application/pdf' });
  return ocrPdfFromGcs(visionClient, storage, bucketName, `gs://${bucketName}/${key}`);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Use POST' });
    }

    const ct = req.headers['content-type'] || '';
    const { visionClient, storage, bucketName } = getGcp();

    // Caminho A: JSON { gcsUri, filename } (quando o arquivo é grande)
    if (ct.includes('application/json')) {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const gcsUri = body.gcsUri;
      if (!gcsUri) return res.status(400).json({ error: 'gcsUri ausente' });

      const md = await ocrPdfFromGcs(visionClient, storage, bucketName, gcsUri);
      return res.status(200).json({ markdown: md, meta: { filename: body.filename, usedOCR: true, source: 'gcs' } });
    }

    // Caminho B: multipart (arquivos pequenos)
    const { buffer, filename, mime } = await readMultipart(req);
    const ext = (path.extname(filename || '').toLowerCase() || '').slice(1);

    let markdown = '', usedOCR = false;
    if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      markdown = await docxToMd(buffer);

    } else if (ext === 'pdf' || mime === 'application/pdf') {
      const text = await pdfText(buffer);
      if (text.replace(/\s/g, '').length > 40) markdown = toMd(text);
      else { markdown = await ocrPdfFromBuffer(visionClient, storage, bucketName, buffer, filename); usedOCR = true; }

    } else if (mime?.startsWith('image/')) {
      markdown = toMd(await ocrImage(visionClient, buffer)); usedOCR = true;

    } else return res.status(415).json({ error: `Tipo não suportado: ${mime || ext}` });

    return res.status(200).json({ markdown, meta: { filename, mime, usedOCR, source: 'upload' } });

  } catch (e) {
    console.error(e);
    // Se a Vercel devolver texto (413), devolvemos JSON amigável
    return res.status(500).json({ error: 'Falha ao converter', details: String(e?.message || e) });
  }
};
