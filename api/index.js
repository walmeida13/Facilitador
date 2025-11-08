// /api/index.js
// Converte PDF/DOCX/Imagem → Markdown.
// PDF nativo: pdf-parse; se vazio, faz OCR via Vision (asyncBatchAnnotateFiles + GCS).
// DOCX: mammoth -> HTML -> turndown -> MD. Imagens: OCR direto.

const Busboy = require('busboy');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const TurndownService = require('turndown');
const vision = require('@google-cloud/vision');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const path = require('path');

module.exports.config = { api: { bodyParser: false } };

// ----- utils -----
function readUpload(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let buffer = null, filename = null, mime = null;

    bb.on('file', (_name, file, info) => {
      filename = info.filename || 'upload';
      mime = info.mimeType || 'application/octet-stream';
      const chunks = [];
      file.on('data', d => chunks.push(d));
      file.on('end', () => (buffer = Buffer.concat(chunks)));
    });

    bb.on('error', reject);
    bb.on('finish', () => buffer ? resolve({ buffer, filename, mime }) : reject(new Error('Nenhum arquivo enviado.')));
    req.pipe(bb);
  });
}

function getGcpClients() {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('Defina GCP_SERVICE_ACCOUNT_KEY (JSON do service account, Base64 ou puro).');
  let credentials;
  try { credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  catch { credentials = JSON.parse(raw); }

  const projectId = credentials.project_id || process.env.GCP_PROJECT_ID;
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) throw new Error('Defina GCS_BUCKET (nome do bucket).');

  const visionClient = new vision.ImageAnnotatorClient({ projectId, credentials });
  const storage = new Storage({ projectId, credentials });
  return { visionClient, storage, bucketName };
}

async function docxToMarkdown(buffer) {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const td = new TurndownService({ headingStyle: 'atx' });
  return td.turndown(html);
}

async function pdfToText(buffer) {
  const d = await pdfParse(buffer);
  return (d.text || '').trim();
}

function plainToMd(text) {
  if (!text) return '';
  let t = text.replace(/\u2022|\u25CF|\u25A0/g, '•').replace(/^\s*•\s*/gm, '- ');
  return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

async function ocrImage(visionClient, buffer) {
  const [r] = await visionClient.documentTextDetection({ image: { content: buffer } });
  return (r?.fullTextAnnotation?.text || '').trim();
}

async function ocrPdf(visionClient, storage, bucketName, buffer, filename) {
  const id = crypto.randomUUID();
  const src = `uploads/${id}/${filename || 'file.pdf'}`;
  const outPrefix = `ocr/${id}/`;

  const bucket = storage.bucket(bucketName);
  await bucket.file(src).save(buffer, { resumable: false, contentType: 'application/pdf' });

  const [op] = await visionClient.asyncBatchAnnotateFiles({
    requests: [{
      inputConfig: { gcsSource: { uri: `gs://${bucketName}/${src}` }, mimeType: 'application/pdf' },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      outputConfig: { gcsDestination: { uri: `gs://${bucketName}/${outPrefix}` }, batchSize: 2 }
    }]
  });
  await op.promise();

  const [files] = await bucket.getFiles({ prefix: outPrefix });
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const pages = [];
  for (const f of files) {
    const [content] = await f.download();
    const json = JSON.parse(content.toString('utf8'));
    for (const r of json.responses || []) {
      const t = r.fullTextAnnotation?.text?.trim();
      if (t) pages.push(plainToMd(t));
    }
  }
  return pages.join('\n\n---\n\n');
}

// ----- handler -----
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Use POST com multipart/form-data (campo "file").' });
    }

    const { buffer, filename, mime } = await readUpload(req);
    const ext = (path.extname(filename || '').toLowerCase() || '').slice(1);
    let markdown = '', usedOCR = false;

    if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      markdown = await docxToMarkdown(buffer);

    } else if (ext === 'pdf' || mime === 'application/pdf') {
      const text = await pdfToText(buffer);
      if (text.replace(/\s/g, '').length > 40) {
        markdown = plainToMd(text);
      } else {
        const { visionClient, storage, bucketName } = getGcpClients();
        markdown = await ocrPdf(visionClient, storage, bucketName, buffer, filename);
        usedOCR = true;
        if (!markdown) markdown = plainToMd(text);
      }

    } else if (mime?.startsWith('image/') || ['png','jpg','jpeg','webp','tif','tiff','bmp'].includes(ext)) {
      const { visionClient } = getGcpClients();
      const text = await ocrImage(visionClient, buffer);
      markdown = plainToMd(text);
      usedOCR = true;

    } else {
      return res.status(415).json({ error: `Tipo de arquivo não suportado: ${mime || ext}` });
    }

    return res.status(200).json({
      markdown,
      meta: { filename, mime, usedOCR }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Falha ao converter.',
      details: String(err?.message || err)
    });
  }
};
