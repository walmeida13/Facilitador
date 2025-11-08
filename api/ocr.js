const vision = require('@google-cloud/vision');

// Configuração das credenciais do Google Cloud
const credentials = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`
};

// Cria cliente do Vision API
const client = new vision.ImageAnnotatorClient({
  credentials: credentials
});

module.exports = async (req, res) => {
  // Habilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhuma imagem enviada' 
      });
    }

    console.log('Processando com Google Cloud Vision...');

    // Processa com Google Cloud Vision
    const [result] = await client.textDetection({
      image: {
        content: imageBase64
      }
    });

    const detections = result.textAnnotations;
    const text = detections.length > 0 ? detections[0].description : '';

    // Limpa e corrige o texto específico para português
    const cleanText = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove caracteres de controle
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();

    console.log('OCR concluído com sucesso');

    return res.status(200).json({ 
      success: true, 
      text: cleanText 
    });

  } catch (error) {
    console.error('Erro no OCR:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao processar OCR' 
    });
  }
};
