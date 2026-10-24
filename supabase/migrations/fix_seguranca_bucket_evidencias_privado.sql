-- Torna o bucket de evidências privado. As imagens passam a ser exibidas via
-- URL assinada (apiService.signAuditExtEvidencias). Aplicar SOMENTE depois que o
-- frontend com essa mudança estiver publicado, senão as imagens quebram.
-- As policies de storage.objects (audext_evidencias_*) já são TO authenticated.
UPDATE storage.buckets SET public = false WHERE id = 'auditoria-evidencias';
