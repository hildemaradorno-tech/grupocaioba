-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Descontinua o nível interno "Itens de Divergência" (tabela
-- audext_divergencias) — cada Divergência (audext_achados) já carrega tudo
-- (Motivo, Total Apontado, Fatos, Recomendações, Evidências) e o Plano de
-- Ação passa a se vincular direto a ela, em vez do item interno.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS achado_id uuid REFERENCES audext_achados(id) ON DELETE CASCADE;

-- Preserva vínculos de planos já criados antes dessa mudança
UPDATE audext_planos_acao p
SET achado_id = d.achado_id
FROM audext_divergencias d
WHERE p.divergencia_id = d.id AND p.achado_id IS NULL;

-- divergencia_id deixa de ser obrigatório (a tabela audext_divergencias
-- continua existindo, só não é mais usada pela aplicação)
ALTER TABLE audext_planos_acao ALTER COLUMN divergencia_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS audext_planos_acao_achado_idx ON audext_planos_acao (achado_id);
