-- Grupo de empresas (Agrupamento: Caiobá Trucks, Caiobá Motos, Outras Caiobá…) do grupo de acesso,
-- só para organizar a lista de Grupos de Acessos.
ALTER TABLE grupos_acesso
  ADD COLUMN IF NOT EXISTS agrupamento_empresa_id uuid REFERENCES dim_agrupamento_empresas(id) ON DELETE SET NULL;
