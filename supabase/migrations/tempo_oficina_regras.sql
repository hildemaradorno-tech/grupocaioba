-- BI Possibilidades › Tempo na Oficina: regra do indicador "% dos veículos que saíram em até N dias" (24/11/2026).
--   ano / mes      : mes NULL = regra anual (vale para todos os meses do ano); mensal tem prioridade sobre a anual
--   empresa_id     : NULL = todas as empresas; regra da empresa tem prioridade quando só ela está selecionada
--   dias_limite    : O.S. com até esse número de dias (abertura → emissão da nota) contam como "dentro"
--   meta_pct       : a partir deste % o relógio fica verde
--   atencao_pct    : a partir deste % (e abaixo da meta) fica amarelo; abaixo, vermelho
CREATE TABLE IF NOT EXISTS public.tempo_oficina_regras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano          int     NOT NULL,
  mes          int     CHECK (mes BETWEEN 1 AND 12),
  empresa_id   uuid    REFERENCES public.dim_empresas(id) ON DELETE CASCADE,
  dias_limite  int     NOT NULL CHECK (dias_limite >= 0),
  meta_pct     numeric NOT NULL CHECK (meta_pct BETWEEN 0 AND 100),
  atencao_pct  numeric NOT NULL CHECK (atencao_pct BETWEEN 0 AND 100),
  media_meta_dias    numeric CHECK (media_meta_dias >= 0),     -- relógio da Média: verde até esses dias
  media_atencao_dias numeric CHECK (media_atencao_dias >= 0),  -- amarelo até esses dias; acima, vermelho
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (atencao_pct <= meta_pct),
  CHECK (media_meta_dias IS NULL OR media_atencao_dias IS NULL OR media_meta_dias <= media_atencao_dias)
);

-- Uma regra por ano + mês (ou anual) + empresa (ou todas)
CREATE UNIQUE INDEX IF NOT EXISTS tempo_oficina_regras_uk
  ON public.tempo_oficina_regras (ano, COALESCE(mes, 0), COALESCE(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.tempo_oficina_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON public.tempo_oficina_regras;
CREATE POLICY auth_all ON public.tempo_oficina_regras FOR ALL TO authenticated USING (true) WITH CHECK (true);
