-- O lote de aprovação (Rascunho -> Conferido -> Conferido DP -> Processado) passa a ser por
-- (período + empresa + SETOR), não mais por departamento — um departamento pode ter vários
-- setores com gerentes diferentes, cada um precisando fechar/conferir sua própria comissão sem
-- travar os outros setores do mesmo departamento (mesmo motivo já resolvido antes entre
-- empresas/departamentos, ver fato_comissoes_lotes_empresa.sql e
-- fato_comissoes_lotes_departamento.sql). departamento_id/departamento_nome continuam na tabela
-- (não removidos) — agora são só informativos/denormalizados (derivados do departamento "pai" do
-- setor), usados pra exibição e pro nível de acesso por departamento já existente em Grupos de
-- Acesso. Lotes criados antes desta migração ficam com setor_id NULL (legado).
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES dim_setores(id) ON DELETE SET NULL;
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS setor_nome text;

DROP INDEX IF EXISTS fato_comissoes_lotes_periodo_empresa_depto_idx;
CREATE UNIQUE INDEX IF NOT EXISTS fato_comissoes_lotes_periodo_empresa_setor_idx
  ON fato_comissoes_lotes (periodo_inicio, periodo_fim, empresa_id, setor_id);
