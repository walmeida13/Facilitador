// /api/index.js
const Busboy = require('busboy');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const TurndownService = require('turndown');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const execAsync = promisify(exec);

module.exports.config = { api: { bodyParser: false } };

// Função auxiliar para criar arquivo temporário
async function createTempFile(buffer, extension) {
  const tempDir = os.tmpdir();
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filepath = path.join(tempDir, filename);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

// Função auxiliar para limpar arquivo temporário
async function cleanupFile(filepath) {
  try {
    await fs.unlink(filepath);
  } catch (e) {
    console.warn(`Falha ao limpar arquivo temporário: ${filepath}`, e);
  }
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

async function pdfText(buf) { 
  const d = await pdfParse(buf); 
  return (d.text || '').trim(); 
}

function toMd(t) {
  if (!t) return '';
  return t.replace(/\u2022|\u25CF|\u25A0/g, '•').replace(/^\s*•\s*/gm, '- ')
          .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

// Função para verificar se Tesseract está instalado
async function checkTesseractInstalled() {
  try {
    await execAsync('tesseract --version');
    return true;
  } catch (e) {
    return false;
  }
}

// Função para instalar Tesseract (apenas em ambientes que permitem)
async function ensureTesseractInstalled() {
  const isInstalled = await checkTesseractInstalled();
  if (isInstalled) return true;

  console.log('Tesseract não encontrado. Tentando instalar...');
  try {
    // Tenta instalar em ambiente Debian/Ubuntu
    await execAsync('apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-por tesseract-ocr-eng');
    console.log('Tesseract instalado com sucesso');
    return true;
  } catch (e) {
    console.error('Falha ao instalar Tesseract:', e);
    return false;
  }
}

// OCR de imagem usando Tesseract diretamente
async function ocrImage(buffer) {
  const tesseractAvailable = await checkTesseractInstalled();
  if (!tesseractAvailable) {
    throw new Error('Tesseract OCR não está disponível. Instale com: apt-get install tesseract-ocr tesseract-ocr-por');
  }

  const inputPath = await createTempFile(buffer, 'png');
  const outputBase = path.join(os.tmpdir(), crypto.randomUUID());
  const outputPath = `${outputBase}.txt`;

  try {
    // Usa Tesseract com português e inglês
    await execAsync(`tesseract "${inputPath}" "${outputBase}" -l por+eng --psm 3`);
    const text = await fs.readFile(outputPath, 'utf8');
    return text.trim();
  } catch (e) {
    console.error('Erro no OCR de imagem:', e);
    throw new Error(`Falha no OCR: ${e.message}`);
  } finally {
    await cleanupFile(inputPath);
    await cleanupFile(outputPath);
  }
}

// OCR de PDF usando OCRmyPDF (que usa Tesseract internamente)
async function ocrPdf(buffer, filename) {
  const tesseractAvailable = await checkTesseractInstalled();
  if (!tesseractAvailable) {
    throw new Error('Tesseract OCR não está disponível. Instale com: apt-get install tesseract-ocr tesseract-ocr-por');
  }

  const inputPath = await createTempFile(buffer, 'pdf');
  const outputPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.pdf`);

  try {
    // Verifica se ocrmypdf está disponível
    try {
      await execAsync('ocrmypdf --version');
    } catch (e) {
      // Se ocrmypdf não estiver disponível, usa Tesseract diretamente
      console.log('OCRmyPDF não disponível, usando Tesseract diretamente');
      
      // Converte PDF para imagens e processa cada página
      const pdfToImageCmd = `pdftoppm "${inputPath}" "${os.tmpdir()}/page" -png`;
      await execAsync(pdfToImageCmd);
      
      // Lista arquivos gerados
      const files = await fs.readdir(os.tmpdir());
      const pageFiles = files.filter(f => f.startsWith('page-') && f.endsWith('.png')).sort();
      
      const pages = [];
      for (const pageFile of pageFiles) {
        const pagePath = path.join(os.tmpdir(), pageFile);
        const pageBuffer = await fs.readFile(pagePath);
        const pageText = await ocrImage(pageBuffer);
        if (pageText) pages.push(pageText);
        await cleanupFile(pagePath);
      }
      
      return pages.join('\n\n---\n\n');
    }

    // Usa OCRmyPDF com otimizações
    // --skip-text: pula páginas que já têm texto
    // --optimize 1: otimização básica
    // --deskew: corrige inclinação
    // --clean: remove ruído de fundo
    // --language por+eng: português e inglês
    const cmd = `ocrmypdf --skip-text --optimize 1 --deskew --clean --language por+eng "${inputPath}" "${outputPath}"`;
    
    await execAsync(cmd, { timeout: 120000 }); // 2 minutos de timeout
    
    // Lê o PDF processado e extrai o texto
    const processedBuffer = await fs.readFile(outputPath);
    const text = await pdfText(processedBuffer);
    
    return text;
  } catch (e) {
    console.error('Erro no OCR de PDF:', e);
    throw new Error(`Falha no OCR do PDF: ${e.message}`);
  } finally {
    await cleanupFile(inputPath);
    await cleanupFile(outputPath);
  }
}

// Detecta se o PDF precisa de OCR analisando a qualidade do texto extraído
function needsOcr(text) {
  if (!text) return true;
  
  const cleanText = text.replace(/\s/g, '');
  
  // Se tem muito pouco texto, provavelmente é escaneado
  if (cleanText.length < 40) return true;
  
  // Calcula a proporção de caracteres não-alfanuméricos
  const nonAlphanumeric = cleanText.replace(/[a-zA-Z0-9À-ÿ]/g, '').length;
  const ratio = nonAlphanumeric / cleanText.length;
  
  // Se mais de 30% são caracteres estranhos, provavelmente precisa de OCR
  if (ratio > 0.3) return true;
  
  return false;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Use POST' });
    }

    const ct = req.headers['content-type'] || '';

    // Suporte para JSON (compatibilidade com versão anterior)
    if (ct.includes('application/json')) {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      
      return res.status(400).json({ 
        error: 'Modo GCS não suportado nesta versão. Use upload direto via multipart/form-data' 
      });
    }

    // Processa multipart
    const { buffer, filename, mime } = await readMultipart(req);
    const ext = (path.extname(filename || '').toLowerCase() || '').slice(1);

    let markdown = '', usedOCR = false, ocrMethod = 'none';

    // Processa DOCX
    if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      markdown = await docxToMd(buffer);

    // Processa PDF
    } else if (ext === 'pdf' || mime === 'application/pdf') {
      // Primeiro tenta extrair texto nativo
      const text = await pdfText(buffer);
      
      if (needsOcr(text)) {
        // Se o texto é insuficiente ou de baixa qualidade, usa OCR
        console.log('PDF requer OCR');
        try {
          markdown = toMd(await ocrPdf(buffer, filename));
          usedOCR = true;
          ocrMethod = 'tesseract';
        } catch (e) {
          // Se OCR falhar, retorna o texto nativo mesmo que seja ruim
          console.error('OCR falhou, usando texto nativo:', e);
          markdown = toMd(text);
          ocrMethod = 'fallback';
        }
      } else {
        // Texto nativo é bom o suficiente
        markdown = toMd(text);
      }

    // Processa imagens
    } else if (mime?.startsWith('image/')) {
      try {
        markdown = toMd(await ocrImage(buffer));
        usedOCR = true;
        ocrMethod = 'tesseract';
      } catch (e) {
        console.error('OCR de imagem falhou:', e);
        return res.status(500).json({ 
          error: 'Falha no OCR da imagem', 
          details: e.message,
          suggestion: 'Verifique se Tesseract está instalado: apt-get install tesseract-ocr tesseract-ocr-por'
        });
      }

    } else {
      return res.status(415).json({ error: `Tipo não suportado: ${mime || ext}` });
    }

    return res.status(200).json({ 
      markdown, 
      meta: { 
        filename, 
        mime, 
        usedOCR, 
        ocrMethod,
        source: 'upload',
        textLength: markdown.length
      } 
    });

  } catch (e) {
    console.error('Erro no processamento:', e);
    return res.status(500).json({ 
      error: 'Falha ao converter', 
      details: String(e?.message || e) 
    });
  }
};
