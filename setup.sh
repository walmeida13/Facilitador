#!/bin/bash
# Script de instalação de dependências do sistema para o Facilitador

echo "=== Instalando dependências do sistema ==="

# Atualiza repositórios
echo "Atualizando repositórios..."
apt-get update -y

# Instala Tesseract OCR com suporte a português e inglês
echo "Instalando Tesseract OCR..."
apt-get install -y tesseract-ocr tesseract-ocr-por tesseract-ocr-eng

# Instala poppler-utils (para pdftoppm - conversão de PDF para imagem)
echo "Instalando poppler-utils..."
apt-get install -y poppler-utils

# Instala Python e pip se não estiverem disponíveis
echo "Verificando Python..."
if ! command -v python3 &> /dev/null; then
    echo "Instalando Python3..."
    apt-get install -y python3 python3-pip
fi

# Instala OCRmyPDF
echo "Instalando OCRmyPDF..."
pip3 install ocrmypdf

# Verifica instalações
echo ""
echo "=== Verificando instalações ==="
echo -n "Tesseract: "
tesseract --version | head -n 1

echo -n "Poppler (pdftoppm): "
pdftoppm -v 2>&1 | head -n 1

echo -n "OCRmyPDF: "
ocrmypdf --version

echo ""
echo "=== Instalação concluída com sucesso! ==="
