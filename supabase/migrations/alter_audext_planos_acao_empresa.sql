ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES proj_empresas(id) ON DELETE SET NULL;
