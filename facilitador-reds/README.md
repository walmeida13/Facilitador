# Facilitador REDS → CNVD/CNMP

**Aplicação para extração automática de dados de REDS (Boletim de Ocorrência) para preenchimento do Cadastro Nacional de Violência Doméstica contra a Mulher (CNVD) do Conselho Nacional do Ministério Público (CNMP).**

---

## Segurança

Esta aplicação foi projetada com **segurança máxima** para proteção de dados sensíveis:

- **Processamento 100% local**: o servidor roda exclusivamente em `127.0.0.1` (localhost), inacessível pela rede.
- **Zero conexões externas**: nenhum dado é enviado para servidores, APIs ou serviços de nuvem.
- **Dados efêmeros**: os PDFs são processados em memória e imediatamente descartados após a extração.
- **OCR local**: quando necessário, o reconhecimento de texto é feito pelo Tesseract, instalado localmente.
- **Headers de segurança**: a aplicação implementa CSP, X-Frame-Options, X-Content-Type-Options e outras proteções.

---

## Requisitos do Sistema

| Requisito | Detalhes |
|---|---|
| **Sistema Operacional** | Windows 10 ou superior |
| **Python** | 3.11 ou superior |
| **Tesseract OCR** | Necessário apenas para PDFs escaneados (opcional) |
| **Navegador** | Chrome, Edge, Firefox (qualquer versão moderna) |
| **Memória RAM** | Mínimo 4GB |

---

## Instalação

### Passo 1: Instalar o Python

1. Acesse [python.org/downloads](https://www.python.org/downloads/)
2. Baixe a versão mais recente do Python 3
3. **IMPORTANTE**: Durante a instalação, marque a opção **"Add Python to PATH"**
4. Conclua a instalação

### Passo 2: Instalar o Tesseract OCR (Opcional)

O Tesseract é necessário **apenas** para processar PDFs escaneados (imagem). Se seus REDS são PDFs nativos (texto selecionável), esta etapa pode ser pulada.

1. Acesse [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
2. Baixe o instalador para Windows (64-bit)
3. Durante a instalação:
   - Adicione o idioma **Portuguese** nas opções de idioma
   - Marque a opção para adicionar ao PATH
4. Após instalar, reinicie o terminal/prompt de comando

### Passo 3: Instalar as Dependências

1. Extraia a pasta `facilitador-reds` para um local de sua preferência
2. Abra o Explorador de Arquivos e navegue até a pasta
3. Dê **duplo clique** em `instalar.bat`
4. Aguarde a instalação das dependências

---

## Como Usar

### Iniciar a Aplicação

1. Dê **duplo clique** em `iniciar.bat`
2. O navegador abrirá automaticamente com a interface da aplicação
3. **Não feche** a janela do terminal (prompt preto) — ela é o servidor

### Processar um REDS

1. Na interface, clique na área de upload ou arraste o PDF do REDS
2. Clique em **"Processar REDS"**
3. Aguarde a extração (poucos segundos para PDFs nativos, mais tempo para escaneados)
4. Os dados extraídos serão exibidos organizados por seção

### Copiar Dados para o CNVD

Cada campo possui um botão **📋** ao lado para copiar individualmente. O fluxo recomendado é:

1. No sistema CNVD, posicione o cursor no campo desejado
2. Na aplicação, clique no botão 📋 ao lado do campo correspondente
3. No sistema CNVD, cole com **Ctrl+V**
4. Repita para cada campo

Também é possível clicar em **"Copiar Todos os Dados"** para copiar um resumo completo.

### Processar Novo REDS

Clique em **"Processar Novo REDS"** para retornar à tela de upload e processar outro documento.

### Encerrar a Aplicação

Feche a janela do terminal (prompt preto) para encerrar o servidor.

---

## Campos Extraídos

### Dados Gerais

| Campo | Descrição |
|---|---|
| Número da Ocorrência (REDS) | Número do REDS no formato AAAA-NNNNNNNNN-NNN |
| Ambiente da Agressão | Mapeado automaticamente para as opções do CNVD |
| Vínculo do Agressor com a Vítima | Mapeado automaticamente para as opções do CNVD |
| Data do Fato | Formato DD/MM/AAAA |
| Hora do Fato | Formato HH:MM |
| Data da Autuação | Formato DD/MM/AAAA |
| UF do Fato | Sigla do estado |
| Cidade do Fato | Nome do município |

### Dados da Vítima e do Agressor

| Campo | Descrição |
|---|---|
| Nome Civil | Nome completo |
| Nome Social | Se disponível no REDS |
| CPF | Formato NNN.NNN.NNN-NN |
| Nome do Pai | Nome completo |
| Nome da Mãe | Nome completo |
| Data de Nascimento | Formato DD/MM/AAAA |
| Gênero | Feminino / Masculino / Outros |
| Cor/Raça | Mapeado para as opções do CNVD |
| Orientação Sexual | Mapeado para as opções do CNVD |

---

## Mapeamento Automático

A aplicação realiza mapeamento inteligente dos termos do REDS para os termos exatos do CNVD:

### Ambiente da Agressão

| Termo no REDS | Opção no CNVD |
|---|---|
| Residência, casa, apartamento (mesmo endereço) | Residência comum com o agressor |
| Residência (endereço diferente, vítima) | Residência exclusiva da vítima |
| Residência (endereço diferente, agressor) | Residência exclusivo do agressor |
| Via pública, praça, parque | Local público |
| Comércio, empresa, trabalho | Profissional |
| Internet, rede social, WhatsApp | Meio eletrônico |

### Vínculo do Agressor com a Vítima

| Termo no REDS | Opção no CNVD |
|---|---|
| Cônjuge, companheiro(a), marido, esposa, convivente | Cônjuge / Companheiro(a) |
| Namorado(a) | Namorado(a) |
| Ex-cônjuge, ex-companheiro(a), ex-marido | Ex-cônjuge / Ex-companheiro(a) |
| Co-habitação, hospitalidade, relações domésticas | Agregado(a) na unidade doméstica |
| Pai, mãe, filho(a), irmão(ã), etc. | Parentesco correspondente |

### Cor/Raça

| Termo no REDS (Cutis) | Opção no CNVD |
|---|---|
| PARDA | Pardo |
| NEGRA / PRETA | Preto |
| BRANCA | Branco |
| AMARELA | Amarelo |
| INDÍGENA | Indígena |
| IGNORADO | Não informado |

---

## Estrutura de Arquivos

```
facilitador-reds/
├── app.py              # Servidor Flask (ponto de entrada)
├── extrator.py         # Módulo de extração e mapeamento
├── requirements.txt    # Dependências Python
├── instalar.bat        # Script de instalação (Windows)
├── iniciar.bat         # Script de inicialização (Windows)
├── README.md           # Esta documentação
├── templates/
│   └── index.html      # Interface HTML
└── static/
    ├── css/
    │   └── style.css   # Estilos
    └── js/
        └── app.js      # JavaScript da interface
```

---

## Solução de Problemas

| Problema | Solução |
|---|---|
| "Python não encontrado" | Reinstale o Python marcando "Add Python to PATH" |
| "Erro ao instalar dependências" | Verifique sua conexão com a internet e tente novamente |
| Dados da vítima/agressor vazios | O PDF pode estar em formato diferente do esperado. Verifique se é um REDS válido |
| OCR com erros | Verifique se o Tesseract está instalado com o idioma Português |
| Navegador não abre | Acesse manualmente http://127.0.0.1:5000 no navegador |
| Porta em uso | A aplicação tentará automaticamente portas alternativas (5001, 5002...) |

---

## Notas Importantes

- **Dados sensíveis**: Esta aplicação foi projetada para lidar com dados sensíveis de violência doméstica. Nunca compartilhe os PDFs dos REDS ou os dados extraídos por meios inseguros.
- **Verificação manual**: Sempre verifique os dados extraídos antes de inseri-los no sistema CNVD, especialmente quando o PDF foi processado via OCR.
- **Atualizações**: Se o formato do REDS mudar, o módulo `extrator.py` pode precisar de ajustes.
