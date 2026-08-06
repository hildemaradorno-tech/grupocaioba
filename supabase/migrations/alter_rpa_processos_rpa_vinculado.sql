-- ============================================================
-- Vínculo PBI → RPA no cadastro de processos: quando o processo
-- é do tipo PBI, pode apontar qual processo RPA o alimenta.
-- Uso: a aba "Atualização" mostra só o PBI e esconde o RPA
-- vinculado (a atualização que vale é a do relatório).
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS rpa_vinculado_id uuid REFERENCES rpa_processos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rpa_vinculado_nome text;
