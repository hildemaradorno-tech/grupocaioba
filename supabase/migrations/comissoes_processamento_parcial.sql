-- Registra os funcionários processados dentro de cada lote para suportar processamento parcial.
ALTER TABLE fato_comissoes_lotes
  ADD COLUMN IF NOT EXISTS funcionarios_processados uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE fato_comissoes_lotes DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_status_check;
ALTER TABLE fato_comissoes_lotes ADD CONSTRAINT fato_comissoes_lotes_status_check
  CHECK (status IN ('RASCUNHO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO'));

ALTER TABLE fato_comissoes_lotes_historico DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_historico_acao_check;
ALTER TABLE fato_comissoes_lotes_historico ADD CONSTRAINT fato_comissoes_lotes_historico_acao_check
  CHECK (acao IN ('CRIADO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO', 'REPROCESSAMENTO_AUTORIZADO', 'REPROCESSAMENTO_SALVO'));