-- Lote de aprovação passa a ser por (período + empresa), não só por período — evita que a
-- ação de um gerente (Conferir/Processar/Excluir) numa empresa afete o lote de outra empresa
-- no mesmo período. Lotes criados antes desta migração ficam com empresa_id NULL (legado).
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES dim_empresas(id) ON DELETE SET NULL;
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS empresa_nome text;

ALTER TABLE fato_comissoes_lotes DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_periodo_inicio_periodo_fim_key;
CREATE UNIQUE INDEX IF NOT EXISTS fato_comissoes_lotes_periodo_empresa_idx
  ON fato_comissoes_lotes (periodo_inicio, periodo_fim, empresa_id);
