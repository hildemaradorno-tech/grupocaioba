-- Novo passo no fluxo de aprovação: depois do Gerente conferir (CONFERIDO), o DP confere de
-- novo (CONFERIDO_DP) antes do RH/Seletiva poder processar o pagamento — dupla checagem exigida
-- pelo setor de DP. RASCUNHO → CONFERIDO → CONFERIDO_DP → PROCESSADO.
ALTER TABLE fato_comissoes_lotes DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_status_check;
ALTER TABLE fato_comissoes_lotes ADD CONSTRAINT fato_comissoes_lotes_status_check
  CHECK (status IN ('RASCUNHO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSADO'));
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS conferido_dp_por text;
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS conferido_dp_em timestamptz;

ALTER TABLE fato_comissoes_lotes_historico DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_historico_acao_check;
ALTER TABLE fato_comissoes_lotes_historico ADD CONSTRAINT fato_comissoes_lotes_historico_acao_check
  CHECK (acao IN ('CRIADO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSADO', 'REPROCESSAMENTO_AUTORIZADO'));
