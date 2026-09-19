-- Marca do Agrupamento de Empresas (ex.: HONDA, DAF). Sem CHECK constraint de propósito:
-- a lista de marcas é definida no frontend e vai crescer.
ALTER TABLE dim_agrupamento_empresas ADD COLUMN IF NOT EXISTS marca text;
