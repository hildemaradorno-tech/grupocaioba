-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Bucket de Storage para evidências (imagens) das Divergências
-- Executar no Supabase SQL Editor
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('auditoria-evidencias', 'auditoria-evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (bucket público — usado pra exibir a imagem direto por URL)
DROP POLICY IF EXISTS "audext_evidencias_select" ON storage.objects;
CREATE POLICY "audext_evidencias_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'auditoria-evidencias');

-- Upload/edição/exclusão só para usuários autenticados (mesmo padrão "auth_all"
-- usado nas tabelas do módulo — controle de acesso fica na aplicação)
DROP POLICY IF EXISTS "audext_evidencias_insert" ON storage.objects;
CREATE POLICY "audext_evidencias_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'auditoria-evidencias');

DROP POLICY IF EXISTS "audext_evidencias_update" ON storage.objects;
CREATE POLICY "audext_evidencias_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'auditoria-evidencias');

DROP POLICY IF EXISTS "audext_evidencias_delete" ON storage.objects;
CREATE POLICY "audext_evidencias_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'auditoria-evidencias');
