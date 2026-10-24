-- Reverte fix_seguranca_rls_por_perfil.sql: volta ao padrão "logado acessa tudo"
-- (continua sem acesso anônimo). Use se alguma tela ficar sem acesso e precisar
-- liberar rápido enquanto a policy da tabela é ajustada.
DROP TRIGGER IF EXISTS trg_sec_usuarios_proteger ON public.usuarios;

DO $$
DECLARE r record; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'grupos_acesso','permissoes_grupo','permissoes_grupo_acoes','usuarios',
    'fato_comissoes_calculadas','fato_comissoes_lotes','fato_comissoes_lotes_historico','fato_politica_comissao',
    'dim_regras_comissao','dim_regras_comissao_faixas','dim_rubricas','dim_cargo_ganhos',
    'rh_ferias','rh_ferias_importacoes','rh_sobreaviso_plantao','config_sobreaviso',
    'permissoes_comissao_modo','permissoes_comissao_valor','permissoes_comissao_escopo',
    'permissoes_comissao_setor_nivel','permissoes_comissao_departamento_nivel','dim_funcionarios'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY auth_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;
