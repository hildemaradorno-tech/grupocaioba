-- Permite filtrar linhas pelo setor cadastrado do funcionário/produtivo.
ALTER TABLE dim_regra_condicoes DROP CONSTRAINT IF EXISTS dim_regra_condicoes_operador_check;
ALTER TABLE dim_regra_condicoes ADD CONSTRAINT dim_regra_condicoes_operador_check CHECK (operador IN (
  'IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM', 'COMECA_COM', 'NAO_COMECA_COM',
  'EM_BRANCO', 'NAO_EM_BRANCO', 'SETOR_OS_IGUAL', 'SETOR_OS_DIFERENTE',
  'SETOR_FUNC_IGUAL', 'SETOR_FUNC_DIFERENTE'
));