# Facilitador

Conversor de PDF/DOCX para Markdown com **OCR de alta performance** usando Tesseract.

## Características

- **Extração de texto nativo**: Tenta primeiro extrair texto embutido nos PDFs
- **OCR inteligente**: Detecta automaticamente quando o PDF precisa de OCR
- **Pré-processamento de imagem**: Corrige inclinação, remove ruído e melhora contraste automaticamente
- **Suporte a múltiplos formatos**: PDF, DOCX e imagens (PNG, JPG, etc.)
- **Alta performance**: Usa Tesseract OCR, motor de código aberto mantido pelo Google
- **Suporte a português e inglês**: OCR otimizado para ambos os idiomas

## Instalação

### 1. Instalar dependências do Node.js

```bash
npm install
```

### 2. Instalar dependências do sistema

**Ubuntu/Debian:**

```bash
sudo bash setup.sh
```

Ou manualmente:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-por tesseract-ocr-eng poppler-utils
pip3 install ocrmypdf
```

**Outras distribuições:**

- **Fedora/RHEL**: `sudo dnf install tesseract tesseract-langpack-por tesseract-langpack-eng poppler-utils && pip3 install ocrmypdf`
- **macOS**: `brew install tesseract tesseract-lang poppler && pip3 install ocrmypdf`
- **Windows**: Baixe o instalador do Tesseract em https://github.com/UB-Mannheim/tesseract/wiki

## Uso

### Como API

```bash
npm start
```

Envie um arquivo via POST multipart/form-data:

```bash
curl -X POST http://localhost:3000/api \
  -F "file=@documento.pdf" \
  -H "Content-Type: multipart/form-data"
```

Resposta:

```json
{
  "markdown": "# Conteúdo do documento\n\nTexto extraído...",
  "meta": {
    "filename": "documento.pdf",
    "mime": "application/pdf",
    "usedOCR": true,
    "ocrMethod": "tesseract",
    "source": "upload",
    "textLength": 1234
  }
}
```

### Deploy na Vercel

O projeto está configurado para deploy na Vercel. Certifique-se de:

1. Adicionar um `Dockerfile` ou usar build pack que instale as dependências do sistema
2. Configurar variáveis de ambiente se necessário

**Nota**: A Vercel tem limitações para executar binários do sistema. Para melhor performance, considere deploy em:
- **Railway**: Suporta Dockerfile
- **Render**: Suporta scripts de build personalizados
- **DigitalOcean App Platform**: Suporta Dockerfile
- **AWS Lambda com container**: Suporte completo a Docker

## Melhorias em relação à versão anterior

### Versão 1.0 (Google Cloud Vision)
- ❌ Dependia de credenciais GCP
- ❌ Requeria bucket no Google Cloud Storage
- ❌ Upload para cloud antes do processamento
- ❌ Custos por uso da API
- ❌ Sem pré-processamento de imagem

### Versão 2.0 (Tesseract OCR)
- ✅ Processamento 100% local
- ✅ Sem dependências de serviços cloud
- ✅ Sem custos adicionais
- ✅ Pré-processamento automático de imagem (deskew, clean)
- ✅ Detecção inteligente de necessidade de OCR
- ✅ Fallback para texto nativo quando possível
- ✅ Suporte a português e inglês otimizado

## Tecnologias

- **Node.js 22**: Runtime JavaScript
- **Tesseract OCR**: Motor de OCR open-source (Google)
- **OCRmyPDF**: Wrapper Python para OCR de PDFs com otimizações
- **pdf-parse**: Extração de texto nativo de PDFs
- **mammoth**: Conversão de DOCX para HTML
- **turndown**: Conversão de HTML para Markdown

## Resolução de problemas

### "Tesseract OCR não está disponível"

Execute o script de instalação:

```bash
sudo bash setup.sh
```

### OCR não está funcionando

Verifique se o Tesseract está instalado corretamente:

```bash
tesseract --version
```

Verifique se os idiomas estão instalados:

```bash
tesseract --list-langs
```

Deve mostrar pelo menos `por` e `eng`.

### PDF muito grande

Para PDFs muito grandes (>10MB), o processamento pode demorar. Considere:
- Aumentar o timeout na requisição
- Processar o PDF em páginas separadas
- Usar um serviço de processamento em background (queue)

## Licença

MIT
