-- Histórico do lote: aceita a ação NF_DEVOLVIDA (Processamento devolve a Nota Fiscal do PJ — ver pj_nf_envios.sql).
ALTER TABLE fato_comissoes_lotes_historico DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_historico_acao_check;
ALTER TABLE fato_comissoes_lotes_historico ADD CONSTRAINT fato_comissoes_lotes_historico_acao_check
  CHECK (acao IN ('CRIADO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO',
                  'REPROCESSAMENTO_AUTORIZADO', 'REPROCESSAMENTO_SALVO', 'PROCESSAMENTO_DESFEITO', 'NF_DEVOLVIDA'));
