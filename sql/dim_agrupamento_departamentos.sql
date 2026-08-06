-- Tabela: dim_agrupamento_departamentos
CREATE TABLE IF NOT EXISTS public.dim_agrupamento_departamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_agrupamento TEXT NOT NULL,
  area             TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT true,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agrup_depto_nome ON public.dim_agrupamento_departamentos (nome_agrupamento);

ALTER TABLE public.dim_agrupamento_departamentos DISABLE ROW LEVEL SECURITY;

-- Adiciona coluna de FK na dim_departamentos (caso ainda não exista)
ALTER TABLE public.dim_departamentos
  ADD COLUMN IF NOT EXISTS agrupamento_departamento_id   UUID REFERENCES public.dim_agrupamento_departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agrupamento_departamento_nome TEXT;
