# Configuração Supabase

Siga os passos abaixo para conectar o projeto ao Supabase.

## 1. Criar Conta e Projeto

1. Acesse https://supabase.com
2. Clique em "Sign Up" e crie uma conta
3. Crie um novo projeto (escolha uma região perto de você)
4. Aguarde a inicialização (~2 minutos)

## 2. Criar Tabelas

No dashboard Supabase, vá para **SQL Editor** e execute cada script abaixo:

### Script 1: Tabela `grupos_acesso`

```sql
CREATE TABLE grupos_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_grupo TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE grupos_acesso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grupos_acesso" ON grupos_acesso FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON grupos_acesso FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Script 2: Tabela `usuarios`

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  grupo_id UUID NOT NULL REFERENCES grupos_acesso(id) ON DELETE RESTRICT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own data" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read all usuarios" ON usuarios FOR SELECT USING (true);
```

### Script 3: Tabela `permissoes_telas`

```sql
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

ALTER TABLE permissoes_telas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read permissoes_telas" ON permissoes_telas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON permissoes_telas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Se a tabela já existe e não tem as colunas novas, rode o patch abaixo:
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS editar BOOLEAN DEFAULT true;
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS excluir BOOLEAN DEFAULT true;
```

### Script 4: Tabela `dim_segmentos`

```sql
CREATE TABLE IF NOT EXISTS dim_segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_segmento TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dim_segmentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dim_segmentos" ON dim_segmentos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON dim_segmentos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON dim_segmentos FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON dim_segmentos FOR DELETE USING (auth.role() = 'authenticated');
```

### Script 5: Tabela `dim_empresas`

```sql
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

ALTER TABLE dim_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dim_empresas" ON dim_empresas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON dim_empresas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON dim_empresas FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON dim_empresas FOR DELETE USING (auth.role() = 'authenticated');
```

### Script 6: Tabela `dim_departamentos`

```sql
CREATE TABLE IF NOT EXISTS dim_departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_departamento TEXT NOT NULL,
  empresa_ids UUID[],
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dim_departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dim_departamentos" ON dim_departamentos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON dim_departamentos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON dim_departamentos FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON dim_departamentos FOR DELETE USING (auth.role() = 'authenticated');
```

### Script 7: Tabela `dim_setores`

```sql
CREATE TABLE IF NOT EXISTS dim_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_setor TEXT NOT NULL,
  departamento_id UUID REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dim_setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dim_setores" ON dim_setores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON dim_setores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON dim_setores FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON dim_setores FOR DELETE USING (auth.role() = 'authenticated');
```

> Se a tabela já foi criada com `empresa_id`, execute no SQL Editor:
> ```sql
> ALTER TABLE dim_setores DROP COLUMN IF EXISTS empresa_id;
> ```

### Script 8: Tabela `dim_box`

```sql
CREATE TABLE IF NOT EXISTS dim_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_box TEXT NOT NULL,
  setor_ids UUID[],
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dim_box ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dim_box" ON dim_box FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert" ON dim_box FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON dim_box FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON dim_box FOR DELETE USING (auth.role() = 'authenticated');
```

### Script 9: Tabela `dim_agrupamento_cargos`

```sql
CREATE TABLE IF NOT EXISTS dim_agrupamento_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agrupamento_cargo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dim_agrupamento_cargos DISABLE ROW LEVEL SECURITY;
```

### Script 10: Tabela `dim_cargos` + tabelas de relacionamento

```sql
CREATE TABLE IF NOT EXISTS public.dim_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cargo TEXT NOT NULL,
  agrupamento_cargo_id UUID REFERENCES public.dim_agrupamento_cargos(id) ON DELETE SET NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.dim_cargos DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rel_cargos_departamentos (
  cargo_id UUID NOT NULL REFERENCES public.dim_cargos(id) ON DELETE CASCADE,
  departamento_id UUID NOT NULL REFERENCES public.dim_departamentos(id) ON DELETE CASCADE,
  PRIMARY KEY (cargo_id, departamento_id)
);
ALTER TABLE public.rel_cargos_departamentos DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rel_cargos_setores (
  cargo_id UUID NOT NULL REFERENCES public.dim_cargos(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.dim_setores(id) ON DELETE CASCADE,
  PRIMARY KEY (cargo_id, setor_id)
);
ALTER TABLE public.rel_cargos_setores DISABLE ROW LEVEL SECURITY;
```

### Script 11: Tabela `dim_natureza_operacoes`

```sql
CREATE TABLE IF NOT EXISTS public.dim_natureza_operacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agrupamento_empresa_id UUID,
  agrupamento_nome TEXT,
  codigo INTEGER,
  natureza_operacao TEXT NOT NULL,
  grupo_movimento TEXT DEFAULT 'Saídas',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.dim_natureza_operacoes DISABLE ROW LEVEL SECURITY;
```

### Script 12: Tabela `dim_tipos_os`

```sql
CREATE TABLE IF NOT EXISTS public.dim_tipos_os (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agrupamento_empresa_id UUID,
  agrupamento_nome TEXT,
  departamento_id UUID,
  departamento_nome TEXT,
  codigo INTEGER,
  tipo_os TEXT NOT NULL,
  sigla TEXT,
  classificacao TEXT,
  setor_servico TEXT,
  tipo_setor_servico TEXT,
  fonte_pagadora TEXT,
  setor_faturamento TEXT,
  tipo_interno TEXT,
  natureza_operacao TEXT,
  moeda TEXT DEFAULT 'BRL',
  preco_faturamento NUMERIC(15,2) DEFAULT 0,
  nti_entra_custo BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.dim_tipos_os DISABLE ROW LEVEL SECURITY;
```

> ALTER TABLE public.dim_empresas
> ADD COLUMN IF NOT EXISTS agrupamento_empresa_id UUID REFERENCES public.dim_agrupamento_empresas(id) ON DELETE SET NULL,
> ADD COLUMN IF NOT EXISTS agrupamento_nome TEXT,
> ADD COLUMN IF NOT EXISTS segmento_id UUID REFERENCES public.dim_segmentos(id) ON DELETE SET NULL,
> ADD COLUMN IF NOT EXISTS segmento_nome TEXT;
> ```

## 3. Configurar Credenciais

1. No dashboard Supabase, vá para **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://xxxx.supabase.co`)
   - **anon public key** (a chave pública, não o secret)

3. Crie arquivo `.env.local` na raiz do projeto:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

4. Salve e reinicie o dev server: `npm run dev`

## 4. Instalar Dependências

```bash
npm install
```

## 5. Rodar Projeto

```bash
npm run dev
```

Acesse `http://localhost:3000` e teste criar grupos e usuários.

---

## Dicas

- **Chave Anon (pública)**: Segura usar no frontend (tem RLS)
- **Chave Service (privada)**: Nunca compartilhe ou coloque no frontend
- **RLS**: Row Level Security protege dados no banco
- Usuários novos precisam confirmar email se habilitado

Qualquer dúvida, consulte: https://supabase.com/docs
