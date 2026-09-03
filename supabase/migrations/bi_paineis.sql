-- Painéis de BI — widgets configuráveis (Medida + corte por dimensão + tipo de visual) que
-- aparecem nos dashboards de BI (hoje só /bi/possibilidades, campo `pagina` deixa aberto pra
-- outros dashboards no futuro). Substitui o slot fixo "Real Peças Balcão" hardcoded por um
-- catálogo de painéis que o usuário monta sozinho, igual monta um visual no Power BI.

CREATE TABLE IF NOT EXISTS dim_bi_paineis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  medida_bi_id    uuid NOT NULL REFERENCES dim_medidas_bi(id) ON DELETE CASCADE,
  tipo_visual     text NOT NULL DEFAULT 'numero' CHECK (tipo_visual IN ('numero', 'tabela', 'barra')),
  dimensoes       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ tipo, nivel? (funcionario), colunaDeParaId?/deparaId? (depara) }]
  pagina          text NOT NULL DEFAULT 'possibilidades',
  ordem           integer NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_paineis_pagina ON dim_bi_paineis(pagina, ordem);

ALTER TABLE dim_bi_paineis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_bi_paineis;
CREATE POLICY "auth_all" ON dim_bi_paineis FOR ALL TO authenticated USING (true) WITH CHECK (true);
