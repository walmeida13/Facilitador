// api/ocr.js
const vision = require('@google-cloud/vision');

// Initialize Google Cloud Vision client with environment variables
const client = new vision.ImageAnnotatorClient({
    credentials: {
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
    }
});

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { imageBase64 } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image data provided' 
            });
        }
        
        // Prepare the image for Google Vision API
        const request = {
            image: {
                content: imageBase64
            },
            features: [
                {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1
                }
            ],
            imageContext: {
                languageHints: ['pt', 'en']
            }
        };
        
        // Call Google Vision API
        const [result] = await client.annotateImage(request);
        
        // Extract text from response
        const fullText = result.fullTextAnnotation?.text || '';
        
        if (!fullText) {
            return res.status(200).json({ 
                success: false, 
                text: '',
                message: 'No text found in image' 
            });
        }
        
        // Clean and format the text
        const cleanedText = cleanText(fullText);
        
        return res.status(200).json({ 
            success: true, 
            text: cleanedText 
        });
        
    } catch (error) {
        console.error('OCR Error:', error);
        
        // Return graceful error
        return res.status(200).json({ 
            success: false, 
            text: '',
            error: error.message 
        });
    }
};

function cleanText(text) {
    if (!text) return '';
    
    // Portuguese-specific corrections
    const corrections = {
        'nao': 'não',
        'acao': 'ação',
        'edicao': 'edição',
        'opcao': 'opção',
        'atencao': 'atenção',
        'informacao': 'informação',
        'situacao': 'situação',
        'decisao': 'decisão',
        'aplicacao': 'aplicação',
        'execucao': 'execução',
        'protecao': 'proteção',
        'funcao': 'função',
        'inscricao': 'inscrição',
        'descricao': 'descrição',
        'obtencao': 'obtenção'
    };
    
    // Clean the text
    let cleaned = text
        // Remove control characters
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
        // Normalize spaces
        .replace(/\s+/g, ' ')
        // Fix common OCR errors
        .replace(/\bl\b/gi, '1')
        .replace(/\bO\b/g, '0')
        .replace(/rn/g, 'm')
        // Fix joined words
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Fix decimal numbers
        .replace(/(\d+)\s*\.\s*(\d+)/g, '$1.$2')
        .trim();
    
    // Apply Portuguese corrections
    Object.keys(corrections).forEach(wrong => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        cleaned = cleaned.replace(regex, corrections[wrong]);
    });
    
    // Split into lines and filter
    const lines = cleaned.split(/\n+/);
    const validLines = lines.filter(line => {
        const trimmed = line.trim();
        
        // Skip empty or too short lines
        if (trimmed.length < 2) return false;
        
        // Skip lines that are too long (likely garbage)
        if (trimmed.length > 500) return false;
        
        // Check if line has enough valid characters
        const validChars = trimmed.match(/[a-zA-ZÀ-ÿ0-9\s.,;:!?()"\-–—]/g);
        if (!validChars) return false;
        
        // Calculate ratio of valid characters
        const validRatio = validChars.length / trimmed.length;
        
        // Keep line if it has > 50% valid characters
        return validRatio > 0.5;
    });
    
    // Join lines back together
    return validLines.join('\n');
}
