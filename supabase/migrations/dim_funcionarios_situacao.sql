-- Código de Situação do Funcionário (padrão eSocial), separado do campo booleano "ativo".
ALTER TABLE dim_funcionarios ADD COLUMN IF NOT EXISTS situacao_funcionario text;
