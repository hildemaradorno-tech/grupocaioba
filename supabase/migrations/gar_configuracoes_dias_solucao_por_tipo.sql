-- Dias para Solucionar por Tipo de OS de garantia (sigla -> dias). Quando um tipo não tem
-- override aqui, usa-se o valor global dias_solucao como padrão.
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_solucao_por_tipo JSONB NOT NULL DEFAULT '{}'::jsonb;
