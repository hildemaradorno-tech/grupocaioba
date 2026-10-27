-- Lote individual de comissão (ex: funcionário desligado no meio do mês): um lote só de um
-- funcionário, no período escolhido na tela, separado do lote do setor — passa pelo mesmo fluxo
-- (Gerente → DP → Processar) e gera o TXT só dele. O lote do setor continua livre, e quem já tem
-- lote individual no período não é recalculado/sobrescrito quando o setor for calculado.
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS funcionario_id uuid REFERENCES dim_funcionarios(id);
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS funcionario_nome text;
-- Só sinalização (badge "Rescisão" nas telas) — não muda o cálculo.
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS rescisao boolean NOT NULL DEFAULT false;

-- Unicidade passa a considerar o funcionário: o lote do setor (funcionario_id nulo) e o lote
-- individual podem ter o mesmo período/empresa/setor.
DROP INDEX IF EXISTS fato_comissoes_lotes_periodo_empresa_setor_idx;
CREATE UNIQUE INDEX fato_comissoes_lotes_periodo_empresa_setor_idx ON fato_comissoes_lotes
  (periodo_inicio, periodo_fim, empresa_id, setor_id, coalesce(funcionario_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS fato_comissoes_lotes_funcionario_idx ON fato_comissoes_lotes (funcionario_id) WHERE funcionario_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
