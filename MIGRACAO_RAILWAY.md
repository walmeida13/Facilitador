# 🚀 Guia de Migração: Vercel para Railway

Este guia detalha o processo passo a passo para migrar sua aplicação **Facilitador** da Vercel para a **Railway**. A migração é recomendada para garantir que o OCR funcione corretamente, já que a Railway suporta o `Dockerfile` necessário para instalar o Tesseract.

## Pré-requisitos

1.  **Conta no GitHub**: Onde seu código já está hospedado.
2.  **Conta no Railway**: Crie uma conta gratuita em [railway.app](https://railway.app) usando sua conta do GitHub.

## Passo a Passo da Migração

### Passo 1: Crie um Novo Projeto no Railway

1.  Acesse seu dashboard no Railway.
2.  Clique em **New Project**.

    ![Novo Projeto no Railway](https://i.imgur.com/gGk5gOR.png)

3.  Selecione a opção **Deploy from GitHub repo**.

    ![Deploy do GitHub](https://i.imgur.com/2oZ2N0o.png)

4.  O Railway pedirá para configurar o acesso ao GitHub. Autorize o acesso e selecione o repositório `walmeida13/Facilitador`.

### Passo 2: Deploy Automático

Assim que você selecionar o repositório, a mágica acontece:

1.  **Detecção Automática**: O Railway irá detectar automaticamente o `Dockerfile` no seu repositório.
2.  **Build e Deploy**: Ele iniciará o processo de build da imagem Docker e o deploy do serviço. Você não precisa fazer mais nada!
3.  **Acompanhe o Deploy**: Você pode acompanhar o progresso em tempo real na aba **Deployments** do seu projeto.

    ![Logs de Deploy](https://i.imgur.com/yBv7g8p.png)

O processo pode levar alguns minutos, pois ele precisa instalar todas as dependências do sistema (Tesseract, Python, etc.).

### Passo 3: Configure o Serviço

Após o deploy ser concluído com sucesso, você precisa fazer uma pequena configuração.

1.  **Gerar Domínio Público**: No dashboard do seu serviço, vá para a aba **Settings**.
2.  Na seção **Networking**, clique em **Generate Domain**. O Railway irá gerar uma URL pública para sua aplicação (ex: `facilitador-production.up.railway.app`).

    ![Gerar Domínio](https://i.imgur.com/B7g9A1C.png)

3.  **Variáveis de Ambiente**: Para este projeto, não são necessárias variáveis de ambiente, pois não há chaves de API. A porta (`PORT`) é configurada automaticamente pelo Railway.

### Passo 4: Teste a Aplicação

1.  Acesse a URL pública gerada pelo Railway.
2.  Você deve ver a resposta JSON da rota raiz do servidor Express.
3.  Use uma ferramenta como Postman ou `curl` para testar o endpoint de conversão:

    ```bash
    curl -X POST https://SUA_URL_AQUI.up.railway.app/api \
      -F "file=@caminho/para/seu/documento.pdf" \
      -H "Content-Type: multipart/form-data"
    ```

    Substitua `SUA_URL_AQUI` pela URL gerada e `caminho/para/seu/documento.pdf` por um arquivo de teste.

### Passo 5: Remova o Projeto da Vercel

Para evitar confusão e custos desnecessários, é importante remover o projeto antigo da Vercel.

1.  Acesse seu dashboard na Vercel.
2.  Vá para as configurações (Settings) do projeto `Facilitador`.
3.  Role para baixo e clique em **Delete Project**.
4.  Confirme a exclusão.

## Resumo das Otimizações Realizadas

Para garantir um deploy perfeito no Railway, as seguintes otimizações foram feitas e já estão no seu repositório:

-   **`Dockerfile` Otimizado**: O `Dockerfile` foi ajustado para seguir as melhores práticas da Railway, incluindo um `HEALTHCHECK` para monitoramento.
-   **Servidor Express (`server.js`)**: Um servidor Express foi adicionado para gerenciar as rotas, incluindo o endpoint `/health` que o Railway usa para verificar se a aplicação está saudável.
-   **`package.json` Atualizado**: Adicionada a dependência do `express` e o script `start` foi atualizado para `node server.js`.
-   **Arquivos de Configuração**: Adicionados `railway.toml` e `.railwayignore` para otimizar o processo de build e deploy.

## Conclusão

Parabéns! Sua aplicação **Facilitador** agora está rodando na Railway, uma plataforma robusta que suporta todas as funcionalidades de OCR que implementamos. Você agora tem uma API de conversão de documentos rápida, confiável e pronta para uso.
