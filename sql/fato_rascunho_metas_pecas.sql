-- ============================================================
-- TABELA: fato_rascunho_metas_pecas
-- Orçamento de Metas - Peças Individual (Pós-Vendas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fato_rascunho_metas_pecas (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Chaves estrangeiras
  empresa_id          UUID         NOT NULL REFERENCES public.dim_empresas(id)      ON DELETE RESTRICT,
  departamento_id     UUID         NOT NULL REFERENCES public.dim_departamentos(id) ON DELETE RESTRICT,
  setor_id            UUID                  REFERENCES public.dim_setores(id)       ON DELETE RESTRICT,
  box_id              UUID                  REFERENCES public.dim_box(id)           ON DELETE RESTRICT,
  cargo_id            UUID                  REFERENCES public.dim_cargos(id)        ON DELETE RESTRICT,
  colaborador_id      UUID         NOT NULL REFERENCES public.dim_funcionarios(id)  ON DELETE RESTRICT,

  -- Nomes desnormalizados (evita JOINs na leitura)
  empresa_nome        TEXT,
  departamento_nome   TEXT,
  setor_nome          TEXT,
  box_nome            TEXT,
  cargo_nome          TEXT,
  colaborador_nome    TEXT,

  -- Período
  ano                 INTEGER      NOT NULL,
  mes                 INTEGER      NOT NULL CHECK (mes BETWEEN 1 AND 12),

  -- Métricas
  dias_uteis_reais    NUMERIC(6,2) NOT NULL DEFAULT 0,   -- Carregado do calendário, editável
  meta_faturamento    NUMERIC(14,2) NOT NULL DEFAULT 0,  -- Digitado pelo usuário
  media_diaria_venda  NUMERIC(14,2) NOT NULL DEFAULT 0,  -- Calculado: meta / dias_uteis

  -- Workflow de aprovação
  status              TEXT         NOT NULL DEFAULT 'AGUARDANDO APROVACAO',

  -- Auditoria
  criado_em           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- 1 registro por empresa/colaborador/ano/mês
  CONSTRAINT uq_metas_pecas_colab_mes UNIQUE (empresa_id, colaborador_id, ano, mes)
);

-- Índice principal: filtro de tela (empresa + ano)
CREATE INDEX IF NOT EXISTS idx_metas_pecas_empresa_ano
  ON public.fato_rascunho_metas_pecas (empresa_id, ano);

-- Índice para agrupamento por departamento
CREATE INDEX IF NOT EXISTS idx_metas_pecas_dept_ano
  ON public.fato_rascunho_metas_pecas (departamento_id, ano);

-- Índice para busca por colaborador
CREATE INDEX IF NOT EXISTS idx_metas_pecas_colab
  ON public.fato_rascunho_metas_pecas (colaborador_id, ano);

-- RLS desabilitado (ambiente de desenvolvimento local)
ALTER TABLE public.fato_rascunho_metas_pecas DISABLE ROW LEVEL SECURITY;
