-- Fonte de Cálculo ganha coluna opcional pra identificar linhas de um funcionário específico
-- (usada quando a Política de Comissão tem nivel_calculo = INDIVIDUAL).
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS coluna_funcionario text;

-- Histórico de comissões calculadas e salvas — cada linha é o resultado de rodar o cálculo
-- pra um funcionário num período específico (folha de pagamento/auditoria).
CREATE TABLE IF NOT EXISTS fato_comissoes_calculadas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id      uuid NOT NULL REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  politica_id         uuid REFERENCES fato_politica_comissao(id) ON DELETE SET NULL,
  fonte_calculo_id    uuid REFERENCES dim_fontes_calculo(id) ON DELETE SET NULL,
  base_calculo_id     uuid REFERENCES dim_bases_calculo(id) ON DELETE SET NULL,
  periodo_inicio      date NOT NULL,
  periodo_fim         date NOT NULL,
  nivel_calculo       text,
  valor_base          numeric NOT NULL DEFAULT 0,
  percentual_aplicado numeric,
  valor_comissao      numeric NOT NULL DEFAULT 0,
  total_linhas_fonte     integer,
  total_linhas_filtradas integer,
  calculado_em        timestamptz NOT NULL DEFAULT now(),
  calculado_por       text
);

CREATE INDEX IF NOT EXISTS idx_comissoes_funcionario_periodo ON fato_comissoes_calculadas(funcionario_id, periodo_inicio, periodo_fim);

ALTER TABLE fato_comissoes_calculadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_comissoes_calculadas;
CREATE POLICY "auth_all" ON fato_comissoes_calculadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
