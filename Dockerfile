# Dockerfile para o Facilitador
FROM node:22-slim

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
RUN npm install --production

# Copia o código da aplicação
COPY . .

# Expõe a porta (ajuste conforme necessário)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
