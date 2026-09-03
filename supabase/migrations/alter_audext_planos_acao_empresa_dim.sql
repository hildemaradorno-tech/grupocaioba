ALTER TABLE audext_planos_acao DROP CONSTRAINT IF EXISTS audext_planos_acao_empresa_id_fkey;
ALTER TABLE audext_planos_acao ADD CONSTRAINT audext_planos_acao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES dim_empresas(id) ON DELETE SET NULL;
