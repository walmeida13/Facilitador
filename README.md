# Facilitador

Conversor de PDF/DOCX para Markdown com **OCR de alta performance** usando Tesseract.

## Características

O **Facilitador** é uma API robusta para conversão de documentos que oferece extração de texto nativo como primeira opção, tentando obter o texto embutido nos PDFs de forma rápida e eficiente. Quando o texto nativo não é suficiente ou de baixa qualidade, o sistema aciona automaticamente o OCR inteligente, que detecta quando o PDF precisa de reconhecimento óptico de caracteres.

O pré-processamento de imagem é aplicado automaticamente, corrigindo inclinação, removendo ruído e melhorando o contraste dos documentos escaneados. O sistema oferece suporte a múltiplos formatos, incluindo PDF, DOCX e diversos formatos de imagem como PNG e JPG.

A solução utiliza o Tesseract OCR, um motor de código aberto mantido pelo Google e reconhecido pela indústria como referência em qualidade. O reconhecimento está otimizado para português e inglês, garantindo alta precisão na extração de texto.

## Deploy Recomendado: Railway

Este projeto está otimizado para deploy na **Railway**, uma plataforma moderna que oferece suporte completo a Docker e todas as dependências necessárias para o OCR funcionar perfeitamente.

### Por que Railway?

A Railway oferece deploy automático integrado com GitHub, permitindo que cada push no repositório gere um novo deploy automaticamente. O suporte nativo a Docker garante que todas as dependências do sistema sejam instaladas corretamente. O modelo de cobrança é baseado em uso real (pay-as-you-go), sendo ideal para APIs de processamento com demanda variável. A plataforma mantém o serviço sempre ativo no plano pago, eliminando problemas de cold start.

### Deploy Rápido no Railway

Para fazer o deploy, basta seguir três passos simples. Primeiro, crie uma conta gratuita em [railway.app](https://railway.app) usando sua conta do GitHub. Em seguida, clique em **New Project** e selecione **Deploy from GitHub repo**. Por fim, escolha o repositório `walmeida13/Facilitador` e aguarde o deploy automático.

O Railway detectará automaticamente o `Dockerfile` e instalará todas as dependências necessárias. Após o deploy, gere um domínio público nas configurações do projeto e sua API estará pronta para uso.

Para instruções detalhadas, consulte o arquivo [MIGRACAO_RAILWAY.md](MIGRACAO_RAILWAY.md).

## Instalação Local

Se você deseja rodar o projeto localmente para desenvolvimento ou testes, siga os passos abaixo.

### Dependências do Node.js

```bash
npm install
```

### Dependências do Sistema

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
- **Windows**: Baixe o instalador do Tesseract em [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)

### Iniciar o Servidor

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`.

## Uso da API

### Conversão de Documento

Envie um arquivo via POST multipart/form-data:

```bash
curl -X POST http://localhost:3000/api \
  -F "file=@documento.pdf" \
  -H "Content-Type: multipart/form-data"
```

### Resposta

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

### Endpoints Disponíveis

O sistema oferece os seguintes endpoints:

- **GET /** - Informações da API
- **GET /health** - Health check para monitoramento
- **POST /api** - Conversão de documentos

## Melhorias em relação à versão anterior

A versão anterior dependia do Google Cloud Vision e apresentava diversas limitações. Era necessário configurar credenciais GCP e um bucket no Google Cloud Storage. O processamento exigia upload para a nuvem, gerando latência de rede. A API cobrava aproximadamente $1.50 por 1000 páginas processadas. Não havia pré-processamento de imagem implementado.

A versão atual utiliza Tesseract OCR e oferece vantagens significativas. O processamento é totalmente local, sem dependências de serviços externos. Não há custos adicionais de API. A privacidade é garantida, pois os documentos não saem do servidor. O pré-processamento automático de imagem melhora a qualidade do OCR. A detecção inteligente otimiza o uso de recursos. O sistema possui fallback robusto para garantir sempre um resultado útil. O suporte é otimizado para português e inglês.

## Tecnologias

O projeto utiliza **Node.js 22** como runtime JavaScript, **Express** para o servidor HTTP, **Tesseract OCR** como motor de reconhecimento óptico de caracteres mantido pelo Google, **OCRmyPDF** como wrapper Python para OCR de PDFs com otimizações, **pdf-parse** para extração de texto nativo de PDFs, **mammoth** para conversão de DOCX para HTML, e **turndown** para conversão de HTML para Markdown.

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

Para PDFs muito grandes (maior que 10MB), o processamento pode demorar. Considere aumentar o timeout na requisição, processar o PDF em páginas separadas ou usar um serviço de processamento em background com filas.

## Documentação Adicional

- [CHANGELOG.md](CHANGELOG.md) - Histórico de mudanças entre versões
- [CORRECOES.md](CORRECOES.md) - Detalhes técnicos das correções implementadas
- [MIGRACAO_RAILWAY.md](MIGRACAO_RAILWAY.md) - Guia completo de migração para Railway

## Licença

MIT
