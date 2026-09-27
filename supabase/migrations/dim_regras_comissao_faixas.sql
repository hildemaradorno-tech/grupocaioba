-- Regras de comissão por faixa: sempre em cima do valor da Base de Cálculo. Cada Regra tem N
-- faixas (operador + valor de corte + percentual); a primeira faixa (por ordem) que casa com o
-- valor da Base define o percentual aplicado sobre esse valor.
CREATE TABLE IF NOT EXISTS dim_regras_comissao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dim_regras_comissao_faixas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id   uuid NOT NULL REFERENCES dim_regras_comissao(id) ON DELETE CASCADE,
  ordem      integer NOT NULL DEFAULT 0,
  operador   text NOT NULL CHECK (operador IN ('>=', '>', '<=', '<')),
  valor      numeric NOT NULL,
  percentual numeric NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_regras_comissao_faixas_regra ON dim_regras_comissao_faixas(regra_id, ordem);

ALTER TABLE dim_regras_comissao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_regras_comissao;
CREATE POLICY "auth_all" ON dim_regras_comissao FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE dim_regras_comissao_faixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_regras_comissao_faixas;
CREATE POLICY "auth_all" ON dim_regras_comissao_faixas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS regra_comissao_id uuid REFERENCES dim_regras_comissao(id) ON DELETE RESTRICT;
