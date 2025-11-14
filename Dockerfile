# Dockerfile para o Facilitador - Otimizado para Railway
FROM node:22-slim

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    tesseract-ocr-eng \
    poppler-utils \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instala OCRmyPDF
RUN pip3 install --no-cache-dir ocrmypdf

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências do Node.js
RUN npm ci --only=production

# Copia o código da aplicação
COPY . .

# Expõe a porta (Railway usa a variável PORT automaticamente)
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["npm", "start"]
