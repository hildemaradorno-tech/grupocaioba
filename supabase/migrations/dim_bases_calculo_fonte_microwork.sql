-- Base de Cálculo pode apontar pra uma Fonte MicroWork (dim_fontes_microwork) em vez de uma
-- Fonte de Cálculo do SharePoint. Uma das duas fica preenchida, conforme o Sistema da Base.
ALTER TABLE dim_bases_calculo ALTER COLUMN fonte_calculo_id DROP NOT NULL;
ALTER TABLE dim_bases_calculo ADD COLUMN IF NOT EXISTS fonte_microwork_id uuid REFERENCES dim_fontes_microwork(id) ON DELETE RESTRICT;
