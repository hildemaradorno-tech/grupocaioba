-- Reverte fix_seguranca_rls_modulos.sql: tabelas dos módulos voltam a "logado acessa tudo".
DO $$
DECLARE r record; t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname IN ('por_modulo','escrita_por_menu')
           AND tablename !~ '^(dim_funcionarios)$' GROUP BY 1 LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
-- Obs.: dim_funcionarios usa a policy "escrita_por_menu" da migration anterior e é preservada acima.
