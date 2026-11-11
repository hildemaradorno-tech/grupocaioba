-- Dias para tratar recusa: prazo (desde a Data Final Avaliação) para o card Recusas — No prazo / Fora do prazo.
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_recusa INTEGER NOT NULL DEFAULT 15;
