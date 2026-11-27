-- BI Possibilidades › aba Peças: separação por Natureza de Operação gravada no Supabase (27/11/2026).
-- Mesma ideia da fato_bi_medidas_diario, com a Natureza (coluna da Fonte BI, ex.: NF_NatOperCod) como dimensão a mais.
-- Gravada pelo backend no "Atualizar" (biMedidasDiarioSync) só para Medidas cuja Fonte tem coluna de Natureza.
-- A tela lê daqui (instantâneo) em vez de ler o SharePoint na hora.
CREATE TABLE IF NOT EXISTS public.fato_bi_natureza_diario (
  medida_id     uuid        NOT NULL REFERENCES public.dim_medidas_bi(id) ON DELETE CASCADE,
  data          date        NOT NULL,
  empresa_norm  text        NOT NULL DEFAULT '',
  tipo_os       text        NOT NULL DEFAULT '',
  funcionario   text        NOT NULL DEFAULT '',
  natureza      text        NOT NULL DEFAULT '',
  soma          numeric     NOT NULL DEFAULT 0,
  linhas        int         NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (medida_id, data, empresa_norm, tipo_os, funcionario, natureza)
);
CREATE INDEX IF NOT EXISTS fato_bi_natureza_diario_data ON public.fato_bi_natureza_diario (data, medida_id);

-- Leitura para usuários logados; gravação só pelo backend (service role, ignora RLS).
ALTER TABLE public.fato_bi_natureza_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON public.fato_bi_natureza_diario;
CREATE POLICY sel_auth ON public.fato_bi_natureza_diario FOR SELECT TO authenticated USING (true);
NOTIFY pgrst, 'reload schema';
