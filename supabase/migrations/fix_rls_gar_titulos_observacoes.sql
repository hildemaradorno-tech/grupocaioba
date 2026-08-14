-- A tabela gar_titulos_observacoes foi criada com RLS habilitado e sem nenhuma
-- política (padrão do editor do Supabase), bloqueando o upsert usado em
-- "Editar Título" (Títulos a Receber) com o erro:
-- "new row violates row-level security policy for table gar_titulos_observacoes".
-- Aplica a mesma política das demais tabelas gar_* (ver garantias_daf.sql).
ALTER TABLE public.gar_titulos_observacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON public.gar_titulos_observacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
