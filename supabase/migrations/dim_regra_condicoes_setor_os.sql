-- Operadores "Setor da O.S. é / não é" nas condições das Regras de Cálculo.
-- O valor gravado é o NOME DO SETOR (ex: "Oficina"); na hora de calcular, o portal traduz
-- pro conjunto de siglas de Tipos de O.S. daquele setor (cadastro Tipos de O.S.) e o motor
-- compara a coluna do arquivo contra essas siglas.
ALTER TABLE dim_regra_condicoes DROP CONSTRAINT IF EXISTS dim_regra_condicoes_operador_check;
ALTER TABLE dim_regra_condicoes ADD CONSTRAINT dim_regra_condicoes_operador_check CHECK (operador IN (
  'IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM', 'COMECA_COM', 'NAO_COMECA_COM',
  'EM_BRANCO', 'NAO_EM_BRANCO', 'SETOR_OS_IGUAL', 'SETOR_OS_DIFERENTE'
));
