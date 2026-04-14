@echo off
chcp 65001 >nul 2>&1
title Instalador - Facilitador REDS

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          INSTALADOR - FACILITADOR REDS → CNVD/CNMP          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar Python
echo [1/3] Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] Python NAO encontrado no sistema.
    echo.
    echo Por favor, instale o Python 3.11 ou superior:
    echo   1. Acesse: https://www.python.org/downloads/
    echo   2. Baixe a versao mais recente
    echo   3. IMPORTANTE: Marque "Add Python to PATH" na instalacao
    echo   4. Apos instalar, execute este script novamente
    echo.
    pause
    exit /b 1
)
echo [OK] Python encontrado.

REM Instalar dependências Python
echo.
echo [2/3] Instalando dependencias Python...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.

REM Verificar Tesseract
echo.
echo [3/3] Verificando Tesseract OCR (para PDFs escaneados)...
tesseract --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [AVISO] Tesseract OCR NAO encontrado.
    echo.
    echo O Tesseract e necessario APENAS para PDFs escaneados (imagem).
    echo PDFs nativos (texto selecionavel) funcionam sem ele.
    echo.
    echo Para instalar o Tesseract:
    echo   1. Acesse: https://github.com/UB-Mannheim/tesseract/wiki
    echo   2. Baixe o instalador para Windows
    echo   3. Durante a instalacao, adicione o idioma "Portuguese"
    echo   4. Adicione o Tesseract ao PATH do sistema
    echo.
) else (
    echo [OK] Tesseract encontrado.
)

echo.
echo ══════════════════════════════════════════════════════════════
echo   INSTALACAO CONCLUIDA!
echo.
echo   Para iniciar o Facilitador REDS, execute: iniciar.bat
echo ══════════════════════════════════════════════════════════════
echo.
pause
