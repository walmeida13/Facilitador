// Função para gerar JWT token para autenticação
async function generateJWT() {
  const crypto = require('crypto');
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: process.env.GOOGLE_PRIVATE_KEY_ID
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const headerJson = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadJson = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${headerJson}.${payloadJson}`;

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signatureInput)
    .sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

// Função para obter access token
async function getAccessToken() {
  const jwt = await generateJWT();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Falha ao obter access token');
  }

  return data.access_token;
}

// Função para limpar texto
function cleanText(text) {
  if (!text) return '';
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  cleaned = cleaned.replace(/[^\w\s.,;:!?()\-—–'""''`@#$/€£¥%&+=*/\[\]{}àáâãäåèéêëìíîïòóôõöùúûüýÿñçÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÝ]/g, ' ');
  const lines = cleaned.split('\n');
  const validLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 2) return false;
    const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, '');
    return alphanumeric.length > 0;
  });
  cleaned = validLines.join('\n');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
  return cleaned.trim();
}

// Main handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Sem imagem' });
    }

    if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: 'Credenciais não configuradas' });
    }

    console.log('🔍 Autenticando com Google Cloud...');
    const accessToken = await getAccessToken();

    console.log('📡 Enviando para Google Cloud Vision API...');
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_PROJECT_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              imageContext: { languageHints: ['pt', 'pt-BR', 'en'] }
            }
          ]
        })
      }
    );

    const visionData = await visionResponse.json();

    if (!visionData.responses?.[0]?.fullTextAnnotation?.text) {
      return res.status(200).json({ success: false, text: '' });
    }

    let text = visionData.responses[0].fullTextAnnotation.text;
    text = cleanText(text);

    console.log('✅ Texto extraído: ' + text.length + ' caracteres');

    return res.status(200).json({
      success: true,
      text: text,
      length: text.length
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return res.status(500).json({ success: false, error: error.message, fallback: true });
  }
}
