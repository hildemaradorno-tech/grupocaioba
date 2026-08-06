-- Motor de regras por Base de Cálculo: lista ordenada de ações condicionais
-- aplicadas ao valor de trabalho de cada linha antes da agregação (SOMA/CONTAGEM/MEDIA).
-- Zero regras = comportamento atual inalterado (só coluna_valor + tipo_agregacao).

CREATE TABLE IF NOT EXISTS dim_regras_calculo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_calculo_id   uuid NOT NULL REFERENCES dim_bases_calculo(id) ON DELETE CASCADE,
  ordem             integer NOT NULL DEFAULT 0,
  tipo_acao         text NOT NULL CHECK (tipo_acao IN (
                       'FILTRAR', 'DEFINIR_VALOR', 'INVERTER_SINAL',
                       'SOMAR_COLUNA', 'SUBTRAIR_COLUNA', 'MULTIPLICAR_COLUNA', 'DIVIDIR_COLUNA'
                     )),
  coluna_alvo       text,              -- usada por DEFINIR_VALOR/SOMAR_COLUNA/SUBTRAIR_COLUNA/MULTIPLICAR_COLUNA/DIVIDIR_COLUNA
  condicao_logica   text CHECK (condicao_logica IN ('E', 'OU')), -- só relevante com 2+ condições
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dim_regra_condicoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id     uuid NOT NULL REFERENCES dim_regras_calculo(id) ON DELETE CASCADE,
  ordem        integer NOT NULL DEFAULT 0,
  coluna       text NOT NULL,
  operador     text NOT NULL CHECK (operador IN (
                  'IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM', 'EM_BRANCO', 'NAO_EM_BRANCO'
                )),
  valor        text,   -- irrelevante para EM_BRANCO/NAO_EM_BRANCO
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regras_calculo_base ON dim_regras_calculo(base_calculo_id, ordem);
CREATE INDEX IF NOT EXISTS idx_regra_condicoes_regra ON dim_regra_condicoes(regra_id, ordem);

ALTER TABLE dim_regras_calculo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_regras_calculo;
CREATE POLICY "auth_all" ON dim_regras_calculo FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_regra_condicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_regra_condicoes;
CREATE POLICY "auth_all" ON dim_regra_condicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
