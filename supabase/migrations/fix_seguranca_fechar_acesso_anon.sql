-- ============================================================
-- Fecha o acesso anônimo (anon key) a TODO o schema public.
-- O app só acessa dados após login (role "authenticated"); o backend usa
-- a service role (ignora RLS). Portanto o role "anon" não precisa de nada.
--
-- 1) Tabela de backup sem RLS (bkp_metas_aprovadas_20260921)
-- 2) Views vw_ctb_* sem restrição (rodavam como owner e ignoravam RLS)
-- 3) Policies abertas a {public} com USING/WITH CHECK (true)
-- 4) REVOKE de todos os privilégios do role anon
-- ============================================================

-- 1) Backup: RLS sem policy = ninguém via API (só service role / conexão direta)
ALTER TABLE IF EXISTS public.bkp_metas_aprovadas_20260921 ENABLE ROW LEVEL SECURITY;

-- 2) Views: passam a respeitar o RLS de quem consulta
ALTER VIEW IF EXISTS public.vw_ctb_centros_resultado SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_ctb_dre_estrutura     SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_ctb_orcamento         SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vw_ctb_plano_contas      SET (security_invoker = true);

-- 3) Remove policies abertas a anon/public e garante policy para authenticated
DO $$
DECLARE
  r record;
  t text;
  tabelas text[] := '{}';
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (roles::text ~ 'public|anon')
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF NOT (r.tablename = ANY (tabelas)) THEN
      tabelas := tabelas || r.tablename;
    END IF;
  END LOOP;

  -- Tabelas que dependiam da policy aberta continuam acessíveis a usuários logados
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 4) anon não acessa nada do schema public (tabelas, views, sequences, funções)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
