-- Permissão própria pra Comissões - HONDA ('calculo-comissoes-motos'), separada de Comissões - DAF
-- ('calculo-comissoes'). Antes as duas telas usavam a mesma permissão.

-- 1) Quem já tinha "Cálculo de Comissões" ganha também a HONDA (ninguém perde acesso); depois cada
--    grupo tira a tela que não é dele em Grupos de Acesso.
INSERT INTO permissoes_grupo (grupo_id, menu_path)
SELECT grupo_id, 'calculo-comissoes-motos' FROM permissoes_grupo WHERE menu_path = 'calculo-comissoes'
ON CONFLICT (grupo_id, menu_path) DO NOTHING;

INSERT INTO permissoes_grupo_acoes (grupo_id, menu_path, acao)
SELECT grupo_id, 'calculo-comissoes-motos', acao FROM permissoes_grupo_acoes WHERE menu_path = 'calculo-comissoes'
ON CONFLICT (grupo_id, menu_path, acao) DO NOTHING;

-- 2) RLS: toda policy que libera por 'calculo-comissoes' passa a liberar também 'calculo-comissoes-motos'.
DO $$
DECLARE
  p record;
  de text := '''calculo-comissoes''::text';
  para text := '''calculo-comissoes''::text, ''calculo-comissoes-motos''::text';
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%' || de || '%'
      AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%calculo-comissoes-motos%'
  LOOP
    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF p.qual IS NOT NULL THEN sql := sql || ' USING (' || replace(p.qual, de, para) || ')'; END IF;
    IF p.with_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || replace(p.with_check, de, para) || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
