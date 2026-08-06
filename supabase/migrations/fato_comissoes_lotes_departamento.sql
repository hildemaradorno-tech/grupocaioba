-- Lote passa a ser por (período + empresa + departamento) — mesmo motivo da migração
-- anterior (fato_comissoes_lotes_empresa.sql), um nível mais fundo: dentro da mesma empresa,
-- cada departamento tem seu próprio lote independente, pra vários gerentes trabalharem ao
-- mesmo tempo sem um travar o dos outros. Lotes criados antes desta migração ficam com
-- departamento_id NULL (legado).
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS departamento_id uuid REFERENCES dim_departamentos(id) ON DELETE SET NULL;
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS departamento_nome text;

ALTER TABLE fato_comissoes_lotes DROP CONSTRAINT IF EXISTS fato_comissoes_lotes_periodo_empresa_idx;
DROP INDEX IF EXISTS fato_comissoes_lotes_periodo_empresa_idx;
CREATE UNIQUE INDEX IF NOT EXISTS fato_comissoes_lotes_periodo_empresa_depto_idx
  ON fato_comissoes_lotes (periodo_inicio, periodo_fim, empresa_id, departamento_id);
