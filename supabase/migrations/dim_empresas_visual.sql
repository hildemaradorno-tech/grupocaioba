-- Marca a empresa como "Empresa Visual" (campo criado como empresa_sintetica e renomeado em 24/10/2026)
ALTER TABLE dim_empresas ADD COLUMN IF NOT EXISTS empresa_visual boolean NOT NULL DEFAULT false;
