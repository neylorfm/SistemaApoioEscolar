# Implementação do Sistema de Apoio Escolar

Este guia descreve como configurar e implantar o projeto **Sistema de Apoio Escolar** em sua própria conta Vercel e Supabase.

## Pré-requisitos
- Conta no [GitHub](https://github.com)
- Conta na [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com)
- [Node.js](https://nodejs.org/) instalado (para rodar localmente)

## 1. Configuração do Banco de Dados (Supabase)

1.  Crie um novo projeto no Supabase.
2.  Vá para o **SQL Editor** na barra lateral.
3.  Clique em **New Query**.
4.  Copie o conteúdo do arquivo [`schema.sql`](./schema.sql) deste repositório e cole no editor.
5.  Clique em **Run** para criar as tabelas necessárias.

> **Nota:** Certifique-se de configurar também os Buckets de Storage necessários (`avatars`, `logos`) se o sistema exigir upload de imagens, e configure as políticas de segurança (RLS) conforme sua necessidade. O `schema.sql` contém apenas a estrutura básica.

## 2. Configuração do Projeto

### Variáveis de Ambiente
O projeto precisa se conectar ao seu banco de dados Supabase. Você precisará das seguintes credenciais do seu projeto Supabase (encontradas em **Project Settings > API**):

- `Project URL`
- `anon` public key

### Rodando Localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/seu-repositorio.git
    cd seu-repositorio
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Crie um arquivo `.env` na raiz do projeto (use `.env.example` como base):
    ```bash
    cp .env.example .env
    ```

4.  Edite o arquivo `.env` e adicione suas credenciais do Supabase:
    ```env
    VITE_SUPABASE_URL=sua_url_do_projeto
    VITE_SUPABASE_ANON_KEY=sua_chave_anonima
    ```

5.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## 3. Implantação na Vercel

1.  Acesse o dashboard da [Vercel](https://vercel.com) e clique em **Add New > Project**.
2.  Importe o seu repositório do GitHub.
3.  Nas configurações de **Environment Variables**, adicione as mesmas variáveis do passo anterior:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
4.  Clique em **Deploy**.

## 4. Implantação no Cloudflare Pages

1.  Acesse o painel do [Cloudflare](https://dash.cloudflare.com/) e vá em **Workers & Pages > Create > Pages > Connect to Git**.
2.  Selecione seu repositório do GitHub.
3.  Nas **Build settings**:
    - **Framework preset:** `Vite` (se não estiver disponível, use `None`)
    - **Build command:** `npm run build`
    - **Build output directory:** `dist`
4.  Em **Environment variables (advanced)**, adicione:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
5.  Clique em **Save and Deploy**.

> **Nota:** O projeto já inclui um arquivo `public/_redirects` necessário para que o roteamento do React funcione corretamente no Cloudflare Pages.

## Solução de Problemas
- **Tabelas não encontradas:** Verifique se o script `schema.sql` foi executado corretamente no Supabase.
- **Erro de conexão:** Verifique se as variáveis de ambiente estão corretas tanto localmente quanto na Vercel ou Cloudflare.
- **Login falhou:** O sistema usa a autenticação do Supabase. Verifique se a tabela `Profissionais` está populada com o ID do usuário correspondente ao login do Supabase para que o perfil seja carregado corretamente. O sistema espera que o `id` na tabela `Profissionais` corresponda ao `id` do usuário no `auth.users` do Supabase.
