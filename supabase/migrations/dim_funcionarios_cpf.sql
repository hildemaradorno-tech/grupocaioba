-- CPF do funcionário — vem do export do ERP (FUNCIONARIOS.xlsx) e é usado pela importação de
-- Funcionários como dado de cadastro. NÃO é chave de casamento na importação: confirmado na
-- planilha que a mesma pessoa (mesmo CPF) pode ter mais de um vínculo ativo simultâneo em CNPJs
-- diferentes do grupo (comum em cargos "AUTONOMO"), então a chave de casamento continua sendo
-- empresa + código do funcionário, igual à importação de Cargos.
ALTER TABLE dim_funcionarios ADD COLUMN IF NOT EXISTS cpf text;
