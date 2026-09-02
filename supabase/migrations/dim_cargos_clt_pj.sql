-- Cargo passa a suportar um código diferente conforme o colaborador seja CLT (registrado) ou
-- PJ (pessoa jurídica/autônomo) — o mesmo cargo pode ter um código pra cada tipo. O campo
-- codigo_cargo que já existe continua sendo o código "em vigor" (o que é usado na unicidade
-- por empresa, na listagem e na importação de Excel) — ele sempre espelha codigo_cargo_clt ou
-- codigo_cargo_pj conforme o tipo_contratacao selecionado na tela, pra não quebrar nada que já
-- lê codigo_cargo direto.
ALTER TABLE dim_cargos ADD COLUMN IF NOT EXISTS tipo_contratacao text NOT NULL DEFAULT 'CLT' CHECK (tipo_contratacao IN ('CLT', 'PJ'));
ALTER TABLE dim_cargos ADD COLUMN IF NOT EXISTS codigo_cargo_clt text;
ALTER TABLE dim_cargos ADD COLUMN IF NOT EXISTS codigo_cargo_pj text;

-- Cargos já cadastrados nunca tiveram essa distinção — o código que já está em codigo_cargo
-- vira o código CLT (o PJ fica vazio até ser preenchido manualmente na tela).
UPDATE dim_cargos SET codigo_cargo_clt = codigo_cargo WHERE codigo_cargo_clt IS NULL;
