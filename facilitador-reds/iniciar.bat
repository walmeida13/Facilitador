@echo off
chcp 65001 >nul 2>&1
title Facilitador REDS - CNVD/CNMP

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          FACILITADOR REDS → CNVD/CNMP                       ║
echo ║                                                              ║
echo ║  Iniciando servidor local...                                 ║
echo ║  O navegador abrirá automaticamente.                        ║
echo ║                                                              ║
echo ║  ⚠  PROCESSAMENTO 100%% LOCAL                                ║
echo ║  ⚠  Feche esta janela para encerrar o servidor               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale o Python 3.11+ em https://www.python.org/downloads/
    echo Marque a opcao "Add Python to PATH" durante a instalacao.
    pause
    exit /b 1
)

REM Verificar se as dependências estão instaladas
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Instalando dependencias pela primeira vez...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas com sucesso!
    echo.
)

REM Verificar Tesseract OCR (necessário apenas para PDFs escaneados)
tesseract --version >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Tesseract OCR nao encontrado.
    echo          PDFs nativos funcionarao normalmente.
    echo          Para processar PDFs escaneados, instale o Tesseract:
    echo          https://github.com/UB-Mannheim/tesseract/wiki
    echo.
)

echo [OK] Iniciando servidor...
echo.
python app.py

pause
