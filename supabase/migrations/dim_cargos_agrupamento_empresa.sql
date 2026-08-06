-- Cargo passa a se relacionar com Agrupamento de Empresas (grupo de empresas),
-- não mais com uma Empresa específica — mesmo padrão já usado em Política de Comissão.
ALTER TABLE dim_cargos ADD COLUMN IF NOT EXISTS agrupamento_empresa_id uuid REFERENCES dim_agrupamento_empresas(id) ON DELETE SET NULL;

-- Migra os vínculos existentes: cada cargo que apontava pra uma empresa específica
-- passa a apontar pro agrupamento dessa empresa.
UPDATE dim_cargos c
SET agrupamento_empresa_id = e.agrupamento_empresa_id
FROM dim_empresas e
WHERE c.empresa_id = e.id AND c.agrupamento_empresa_id IS NULL;

ALTER TABLE dim_cargos DROP COLUMN IF EXISTS empresa_id;
