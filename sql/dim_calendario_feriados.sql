-- ============================================================
-- TABELA: dim_calendario_feriados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dim_calendario_feriados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.dim_empresas(id) ON DELETE RESTRICT,
  empresa_nome    TEXT,                          -- desnormalizado para evitar JOIN na leitura
  data_feriado    DATE NOT NULL,
  dia_semana      TEXT,
  descricao       TEXT NOT NULL,
  tipo_pausa      TEXT NOT NULL CHECK (tipo_pausa  IN ('FERIADO','PARADA PARCIAL','PARADA TOTAL')),
  tipo_feriado    TEXT NOT NULL CHECK (tipo_feriado IN ('ESTADUAL','MUNICIPAL','NACIONAL')),
  tipo_data       TEXT NOT NULL CHECK (tipo_data   IN ('FIXA','MÓVEL')),
  ano             INTEGER NOT NULL,              -- coluna materializada para filtro eficiente
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice composto: filtro principal da tela (empresa + ano)
CREATE INDEX IF NOT EXISTS idx_cal_feriados_empresa_ano
  ON public.dim_calendario_feriados (empresa_id, ano);

-- Índice por data para relatórios de calendário
CREATE INDEX IF NOT EXISTS idx_cal_feriados_data
  ON public.dim_calendario_feriados (data_feriado);

-- RLS: permite acesso anônimo (igual às outras tabelas do sistema)
ALTER TABLE public.dim_calendario_feriados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_dim_calendario_feriados" ON public.dim_calendario_feriados;
CREATE POLICY "allow_all_dim_calendario_feriados"
  ON public.dim_calendario_feriados
  FOR ALL
  USING (true)
  WITH CHECK (true);
