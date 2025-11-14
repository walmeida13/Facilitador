# Changelog

## [2.0.0] - 2025-11-13

### 🎉 Mudanças Importantes

**Migração de Google Cloud Vision para Tesseract OCR**

Esta versão representa uma reescrita completa do sistema de OCR, eliminando a dependência de serviços cloud e implementando processamento local de alta performance.

### ✨ Novos Recursos

- **OCR Local com Tesseract**: Processamento 100% local usando o motor Tesseract (mantido pelo Google)
- **Pré-processamento Inteligente de Imagem**: 
  - Correção automática de inclinação (deskew)
  - Remoção de ruído de fundo (clean)
  - Otimização de contraste
- **Detecção Inteligente de OCR**: Analisa a qualidade do texto extraído nativamente e decide automaticamente se OCR é necessário
- **Suporte Multilíngue**: Otimizado para português e inglês
- **Fallback Robusto**: Se OCR falhar, retorna texto nativo com aviso
- **Metadados Enriquecidos**: Resposta inclui informações sobre método usado (OCR ou texto nativo)

### 🔧 Melhorias

- **Performance**: Processamento local elimina latência de rede
- **Custo**: Sem custos de API externa
- **Privacidade**: Documentos não saem do servidor
- **Confiabilidade**: Não depende de disponibilidade de serviços externos
- **Qualidade**: Pré-processamento melhora significativamente a precisão do OCR

### 🗑️ Removido

- Dependência de `@google-cloud/vision`
- Dependência de `@google-cloud/storage`
- Suporte a modo GCS (Google Cloud Storage)
- Necessidade de credenciais GCP
- Necessidade de bucket GCS

### 📦 Novas Dependências

**Sistema:**
- `tesseract-ocr`: Motor de OCR
- `tesseract-ocr-por`: Pacote de idioma português
- `tesseract-ocr-eng`: Pacote de idioma inglês
- `poppler-utils`: Ferramentas para manipulação de PDF
- `ocrmypdf`: Wrapper Python para OCR de PDFs

**Node.js:**
- Mantidas as mesmas dependências (busboy, mammoth, pdf-parse, turndown)

### 🐛 Correções

- **Problema principal resolvido**: PDFs escaneados agora são processados corretamente via OCR
- Melhor detecção de quando OCR é necessário
- Tratamento de erros mais robusto
- Limpeza adequada de arquivos temporários

### 📝 Documentação

- README completamente reescrito com instruções detalhadas
- Script de instalação automatizado (`setup.sh`)
- Dockerfile para facilitar deploy
- Guia de resolução de problemas
- Comparação entre versões 1.0 e 2.0

### 🚀 Deploy

- Adicionado Dockerfile para deploy em plataformas que suportam containers
- Instruções para Railway, Render, DigitalOcean e AWS Lambda
- Nota sobre limitações da Vercel para binários do sistema

### ⚠️ Breaking Changes

- **API GCS removida**: Não é mais possível enviar `gcsUri` via JSON. Use upload direto via multipart/form-data
- **Variáveis de ambiente**: Não são mais necessárias `GCP_SERVICE_ACCOUNT_KEY` e `GCS_BUCKET`
- **Resposta da API**: Campo `meta.ocrMethod` agora indica o método usado (`tesseract`, `fallback` ou `none`)

### 📊 Comparação de Performance

| Aspecto | v1.0 (GCP Vision) | v2.0 (Tesseract) |
|---------|-------------------|------------------|
| Latência | 3-10s (upload + processamento) | 1-5s (local) |
| Custo | $1.50/1000 páginas | $0 (grátis) |
| Privacidade | Dados enviados para GCP | 100% local |
| Qualidade | Excelente | Muito boa |
| Pré-processamento | Não | Sim (automático) |
| Idiomas | 50+ | Configurável (por+eng) |

### 🔜 Próximos Passos

Melhorias planejadas para versões futuras:
- Suporte a mais idiomas
- API para configurar parâmetros de OCR
- Processamento paralelo de páginas
- Cache de resultados
- Suporte a OCR de tabelas estruturadas
- Integração com modelos de IA para pós-processamento

---

## [1.0.0] - Data anterior

### Recursos Iniciais

- Conversão de PDF para Markdown usando Google Cloud Vision
- Conversão de DOCX para Markdown
- Suporte a imagens via OCR
- API REST com upload multipart
- Deploy na Vercel
