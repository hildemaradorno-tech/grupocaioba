-- Segunda regra de prazo: dias_solucao controla, separado de dias_digitacao, o corte "em dia" x
-- "atrasado" dentro de Aguardando Aprovação DAF — fase pós-digitação (aguardando solução/aprovação).
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_solucao INTEGER NOT NULL DEFAULT 14;
