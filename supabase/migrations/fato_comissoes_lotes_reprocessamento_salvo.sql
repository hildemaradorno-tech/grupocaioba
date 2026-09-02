-- Correção pontual (funcionário liberado pra reprocessamento parcial, recalculado e salvo de
-- novo) precisa passar pelo DP de novo antes do RH/Seletiva processar — sem isso, o valor
-- corrigido seguiria pro pagamento sem ninguém ter revisado o número novo. Quando isso acontece
-- com o lote em CONFERIDO_DP ou PROCESSADO, o status volta pra CONFERIDO (só a etapa do DP é
-- desfeita — a conferência do Gerente continua valendo, já que foi ele quem corrigiu e salvou).
ALTER TABLE fato_comissoes_lotes_historico DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_historico_acao_check;
ALTER TABLE fato_comissoes_lotes_historico ADD CONSTRAINT fato_comissoes_lotes_historico_acao_check
  CHECK (acao IN ('CRIADO', 'CONFERIDO', 'CONFERIDO_DP', 'PROCESSADO', 'REPROCESSAMENTO_AUTORIZADO', 'REPROCESSAMENTO_SALVO'));
