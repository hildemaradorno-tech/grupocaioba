-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Ajuste 5: "Setor" passa a ser propriedade do cadastro de Processos
-- (rpa_processos), não mais escolhido manualmente em cada rotina. Ao
-- selecionar um processo em "Nova Rotina", o setor é preenchido sozinho.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS departamento_id uuid REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departamento_nome text;

-- Backfill: usa o setor já preenchido nas rotinas existentes de cada processo
-- (quando houver mais de um setor por processo, pega o mais recente).
UPDATE rpa_processos p
SET departamento_id = r.departamento_id, departamento_nome = r.departamento_nome
FROM (
  SELECT DISTINCT ON (processo_id) processo_id, departamento_id, departamento_nome
  FROM rpa_rotinas
  WHERE processo_id IS NOT NULL AND departamento_id IS NOT NULL
  ORDER BY processo_id, atualizado_em DESC
) r
WHERE p.id = r.processo_id AND p.departamento_id IS NULL;
