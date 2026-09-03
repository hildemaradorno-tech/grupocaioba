-- Checklist pro DP não se perder revisando um lote com muitos funcionários — cada um é marcado
-- como "revisado" manualmente, e "Confirmar Conferência" só libera quando todos estiverem
-- marcados. Quando um funcionário é liberado pra reprocessamento (autorizado) ou tem a correção
-- salva de novo, ele sai desse array automaticamente (volta a aparecer como pendente), já que o
-- valor dele mudou e precisa ser olhado de novo.
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS funcionarios_conferidos_dp uuid[] NOT NULL DEFAULT '{}';
