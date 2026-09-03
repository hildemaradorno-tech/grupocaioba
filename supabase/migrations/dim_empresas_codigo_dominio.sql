-- Código da empresa especificamente no sistema Domínio (folha de pagamento) — separado do
-- "Código Empresa" genérico que já existe (usado internamente pelo Portal), pra não misturar os
-- dois: o TXT de pagamento (Processamento de Comissões) precisa do código EXATO cadastrado no
-- Domínio, que pode ser diferente do código interno do Portal.
ALTER TABLE dim_empresas ADD COLUMN IF NOT EXISTS codigo_empresa_dominio text;
