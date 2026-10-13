-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- O Responsável pela Auditoria passa a vir de dim_funcionarios
-- (funcionários ativos). O cadastro aud_responsaveis deixa de ser usado.
-- ============================================================

-- Limpa vínculos antigos com aud_responsaveis (em 13/10/2026 não havia nenhum)
UPDATE aud_auditoria_os SET responsavel_id = NULL
WHERE responsavel_id IS NOT NULL
  AND responsavel_id NOT IN (SELECT id FROM dim_funcionarios);

ALTER TABLE aud_auditoria_os DROP CONSTRAINT IF EXISTS aud_auditoria_os_responsavel_id_fkey;

ALTER TABLE aud_auditoria_os
  ADD CONSTRAINT aud_auditoria_os_responsavel_id_fkey
  FOREIGN KEY (responsavel_id) REFERENCES dim_funcionarios(id) ON DELETE SET NULL;
