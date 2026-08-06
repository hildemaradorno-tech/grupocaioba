-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Adiciona a etapa de fluxo (aba) de cada OS auditada: Conferir,
-- Em Aberto ou Respondido. Toda OS importada entra em "Conferir".
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE aud_auditoria_os
  ADD COLUMN IF NOT EXISTS status_aba text NOT NULL DEFAULT 'conferir'
    CHECK (status_aba IN ('conferir', 'aberto', 'respondido'));
