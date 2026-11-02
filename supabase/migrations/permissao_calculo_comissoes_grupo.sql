-- Comissões - GRUPO ('calculo-comissoes-grupo'): tela de cálculo do agrupamento Outras Caiobá, com
-- permissão própria (como DAF e HONDA). Nenhum grupo ganha acesso aqui — libera em Grupos de Acesso.

-- RLS: toda policy que libera por 'calculo-comissoes-motos' passa a liberar também 'calculo-comissoes-grupo'.
DO $$
DECLARE
  p record;
  de text := '''calculo-comissoes-motos''::text';
  para text := '''calculo-comissoes-motos''::text, ''calculo-comissoes-grupo''::text';
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%' || de || '%'
      AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%calculo-comissoes-grupo%'
  LOOP
    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF p.qual IS NOT NULL THEN sql := sql || ' USING (' || replace(p.qual, de, para) || ')'; END IF;
    IF p.with_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || replace(p.with_check, de, para) || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
