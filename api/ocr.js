const vision = require('@google-cloud/vision');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const client = new vision.ImageAnnotatorClient({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      }
    });

    const request = {
      image: { content: imageBase64 },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      imageContext: { languageHints: ['pt', 'en'] },
    };

    const [result] = await client.annotateImage(request);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return res.status(200).json({ 
        text: '',
        success: true,
      });
    }

    let fullText = detections[0].description || '';
    fullText = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    fullText = fullText.trim();

    return res.status(200).json({
      text: fullText,
      success: true,
      confidence: detections[0].confidence || 0
    });

  } catch (error) {
    console.error('OCR Error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
};
