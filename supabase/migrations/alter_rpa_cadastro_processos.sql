-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Ajuste 3: cadastro de "Processos/Relatórios" (rpa_processos), para
-- selecionar em vez de digitar toda vez. rpa_rotinas ganha processo_id
-- (FK) e mantém "processo" como nome denormalizado para exibição/busca.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS rpa_processos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rpa_rotinas
  ADD COLUMN IF NOT EXISTS processo_id uuid REFERENCES rpa_processos(id) ON DELETE SET NULL;

-- Backfill: cria um cadastro para cada nome de processo já usado em rpa_rotinas
-- e vincula as rotinas existentes a ele.
INSERT INTO rpa_processos (nome)
SELECT DISTINCT processo FROM rpa_rotinas WHERE processo IS NOT NULL AND processo <> ''
ON CONFLICT (nome) DO NOTHING;

UPDATE rpa_rotinas r
SET processo_id = p.id
FROM rpa_processos p
WHERE r.processo = p.nome AND r.processo_id IS NULL;

ALTER TABLE rpa_processos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON rpa_processos;
CREATE POLICY "auth_all" ON rpa_processos FOR ALL TO authenticated USING (true) WITH CHECK (true);
