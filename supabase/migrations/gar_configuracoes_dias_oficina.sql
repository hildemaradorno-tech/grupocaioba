-- Dias na Oficina: prazo (desde a criação da OS) para o card "Mais de N Dias na Oficina", separado de dias_digitacao.
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_oficina INTEGER NOT NULL DEFAULT 14;
