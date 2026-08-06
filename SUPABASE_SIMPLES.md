# 🚀 Guia Simples - Supabase Setup (Passo-a-Passo)

## PASSO 1: Criar Conta (5 minutos)

1. Abra https://supabase.com
2. Clique em **"Sign Up"** (canto superior direito)
3. Faça login com GitHub, Google ou email
4. Pronto! Você tem uma conta

## PASSO 2: Criar um Projeto (2 minutos)

1. Após login, clique em **"New Project"**
2. Escolha um nome (ex: "portal-gestao")
3. Escolha uma região perto de você (ex: "South America - São Paulo")
4. Digite uma senha (qualquer uma, use para depois)
5. Clique em **"Create new project"**
6. **Aguarde 2 minutos** até aparecer "Your project is ready"

## PASSO 3: Copiar Credenciais (1 minuto)

1. Na página do seu projeto, vá para **Settings** (engrenagem, canto inferior esquerdo)
2. Clique em **"API"**
3. Você verá:
   - **Project URL** - copie essa URL
   - **anon public** - copie essa chave (a que diz "service_role" é PRIVADA, não copie)

## PASSO 4: Colar no Arquivo `.env.local` (1 minuto)

1. Abra seu projeto em VS Code
2. Na **raiz** do projeto (onde está `package.json`), crie um arquivo chamado `.env.local`
3. Cole exatamente isso, substituindo pelos seus dados:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...sua-chave-aqui
```

Exemplo completo:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjAwMDAwMDAsImV4cCI6MjA3MjA0MTYwMH0.sua-chave-longa-aqui
```

## PASSO 5: Criar as Tabelas (5 minutos)

1. De volta no Supabase, clique em **"SQL Editor"** (na barra esquerda)
2. Clique em **"New Query"**
3. Cole o código abaixo e clique **"Run"**:

```sql
-- Criar tabela GRUPOS
CREATE TABLE grupos_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_grupo TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela USUÁRIOS
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grupo_id UUID NOT NULL REFERENCES grupos_acesso(id) ON DELETE RESTRICT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela PERMISSÕES
CREATE TABLE permissoes_telas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  menu_path TEXT NOT NULL,
  visualizar BOOLEAN DEFAULT true,
  editar BOOLEAN DEFAULT true,
  excluir BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(grupo_id, menu_path)
);

-- Se a tabela já existe e não tem as colunas novas, rode o patch abaixo:
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS editar BOOLEAN DEFAULT true;
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS excluir BOOLEAN DEFAULT true;

-- Criar tabela AGRUPAMENTO EMPRESAS
CREATE TABLE IF NOT EXISTS dim_agrupamento_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agrupamento TEXT NOT NULL,
  segmento TEXT,
  empresa_nome TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela SEGMENTOS
CREATE TABLE IF NOT EXISTS dim_segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_segmento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela EMPRESAS
CREATE TABLE IF NOT EXISTS dim_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agrupamento_empresa_id UUID REFERENCES dim_agrupamento_empresas(id) ON DELETE SET NULL,
  agrupamento_nome TEXT,
  segmento_id UUID REFERENCES dim_segmentos(id) ON DELETE SET NULL,
  segmento_nome TEXT,
  codigo_empresa INT,
  sigla_empresa TEXT,
  nome_empresa TEXT,
  empresa_fantasia TEXT,
  marca TEXT,
  cnpj TEXT,
  codigo_concessionaria TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> Se as tabelas `grupos_acesso`, `usuarios` e `permissoes_telas` já existem, você pode rodar apenas a parte abaixo:

```sql
CREATE TABLE IF NOT EXISTS dim_agrupamento_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agrupamento TEXT NOT NULL,
  segmento TEXT,
  empresa_nome TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS editar BOOLEAN DEFAULT true;
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS excluir BOOLEAN DEFAULT true;
```

4. Se aparecer "Success" ✅, pronto!

## PASSO 6: Rodar o Projeto (1 minuto)

1. Abra terminal na pasta do projeto
2. Execute:

```bash
npm install
npm run dev
```

3. Abra `http://localhost:3000` no navegador
4. Teste criando um grupo!

---

## ❓ Ficou com dúvida?

- **"Não consigo encontrar SQL Editor"**: Procure na barra esquerda por "SQL" (pode estar ao lado de "Database")
- **"Não copiou a chave certa"**: Voltei em Settings → API → copie a chave que **não** diz "service_role"
- **"Meu projeto não aparece"**: Pode ser que ainda está carregando (aguarde 2-3 min)

---

## Se funcionou! ✅

Você deve conseguir:
1. Criar Grupos
2. Criar Usuários
3. Editar Permissões

Qualquer erro, avisa!
