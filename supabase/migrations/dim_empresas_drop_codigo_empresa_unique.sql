-- Código Empresa Sistema deixou de ser único por empresa — com filiais no MicroWork Cloud
-- (Nº Filial Sistema) o mesmo código pode se repetir em empresas/filiais diferentes do mesmo
-- grupo. O CNPJ (dim_empresas_cnpj_key) continua sendo o único identificador realmente único.
ALTER TABLE dim_empresas DROP CONSTRAINT IF EXISTS dim_empresas_codigo_empresa_key;
