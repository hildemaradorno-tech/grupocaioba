-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Corrige o bucket de evidências: leitura só para usuários logados no Portal
-- (antes estava aberta a qualquer um com o link, sem exigir login).
-- Executar no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "audext_evidencias_select" ON storage.objects;
CREATE POLICY "audext_evidencias_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'auditoria-evidencias');
