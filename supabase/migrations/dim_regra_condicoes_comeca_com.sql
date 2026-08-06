-- Adiciona os operadores COMECA_COM / NAO_COMECA_COM às condições das Regras de Cálculo —
-- ex: "incluir linha somente se TMO Referência NÃO começa com T".
ALTER TABLE dim_regra_condicoes DROP CONSTRAINT IF EXISTS dim_regra_condicoes_operador_check;
ALTER TABLE dim_regra_condicoes ADD CONSTRAINT dim_regra_condicoes_operador_check CHECK (operador IN (
  'IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM', 'COMECA_COM', 'NAO_COMECA_COM', 'EM_BRANCO', 'NAO_EM_BRANCO'
));
