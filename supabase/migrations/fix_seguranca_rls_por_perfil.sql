-- ============================================================
-- RLS por perfil (Governança): usuário logado só acessa o que o grupo dele permite.
-- Fonte da verdade: usuarios.grupo_id -> grupos_acesso.is_admin / permissoes_grupo.menu_path
-- (a mesma que o frontend usa em PermissionRoute). Backend (service role) ignora RLS.
-- Reversão: fix_seguranca_rls_por_perfil_rollback.sql
-- ============================================================

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.sec_grupo_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT grupo_id FROM public.usuarios
  WHERE ativo IS NOT FALSE AND lower(email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.sec_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT g.is_admin FROM public.grupos_acesso g WHERE g.id = public.sec_grupo_id()), false)
$$;

CREATE OR REPLACE FUNCTION public.sec_tem_menu(VARIADIC paths text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sec_is_admin() OR EXISTS (
    SELECT 1 FROM public.permissoes_grupo p
    WHERE p.grupo_id = public.sec_grupo_id() AND p.menu_path = ANY (paths)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.sec_grupo_id(), public.sec_is_admin(), public.sec_tem_menu(text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sec_grupo_id(), public.sec_is_admin(), public.sec_tem_menu(text[]) TO authenticated, service_role;

-- Remove todas as policies atuais das tabelas informadas
CREATE OR REPLACE FUNCTION pg_temp.limpar_policies(tabs text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename = ANY (tabs) LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- ETAPA 1 — Governança: ninguém se promove a admin pela API
-- ============================================================
SELECT pg_temp.limpar_policies(ARRAY['grupos_acesso','permissoes_grupo','permissoes_grupo_acoes','usuarios']);

-- leitura liberada a logados (o AuthContext precisa do próprio grupo/permissões)
-- escrita só para quem tem o menu de governança
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['grupos_acesso','permissoes_grupo','permissoes_grupo_acoes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY sel_auth ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY escrita_governanca ON public.%I FOR ALL TO authenticated
                    USING (public.sec_tem_menu(''grupos'',''permissoes-matriz''))
                    WITH CHECK (public.sec_tem_menu(''grupos'',''permissoes-matriz''))', t);
  END LOOP;
END $$;

-- usuarios: leitura geral (nomes em listas/responsáveis); insert/delete só com menu "usuarios";
-- update: menu "usuarios" OU a própria linha (preferências, troca de senha)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY sel_auth ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY ins_admin ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.sec_tem_menu('usuarios'));
CREATE POLICY del_admin ON public.usuarios FOR DELETE TO authenticated USING (public.sec_tem_menu('usuarios'));
CREATE POLICY upd_admin_ou_proprio ON public.usuarios FOR UPDATE TO authenticated
  USING (public.sec_tem_menu('usuarios') OR lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (public.sec_tem_menu('usuarios') OR lower(email) = lower(auth.jwt() ->> 'email'));

-- Quem só edita a própria linha não pode mudar grupo, status, e-mail, cargo ou vínculo
CREATE OR REPLACE FUNCTION public.sec_usuarios_proteger_campos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.sec_tem_menu('usuarios') THEN
    IF NEW.grupo_id IS DISTINCT FROM OLD.grupo_id
       OR NEW.ativo IS DISTINCT FROM OLD.ativo
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id
       OR NEW.funcionario_id IS DISTINCT FROM OLD.funcionario_id THEN
      RAISE EXCEPTION 'Sem permissão para alterar grupo, status, e-mail, cargo ou vínculo do usuário.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sec_usuarios_proteger ON public.usuarios;
CREATE TRIGGER trg_sec_usuarios_proteger BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.sec_usuarios_proteger_campos();

-- ============================================================
-- ETAPA 2 — Comissões, Funcionários e RH
-- ============================================================
-- Comissões: leitura e escrita só para quem tem algum menu do módulo
SELECT pg_temp.limpar_policies(ARRAY[
  'fato_comissoes_calculadas','fato_comissoes_lotes','fato_comissoes_lotes_historico','fato_politica_comissao',
  'dim_regras_comissao','dim_regras_comissao_faixas','dim_rubricas','dim_cargo_ganhos',
  'rh_ferias','rh_ferias_importacoes','rh_sobreaviso_plantao','config_sobreaviso']);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fato_comissoes_calculadas','fato_comissoes_lotes','fato_comissoes_lotes_historico','fato_politica_comissao',
                           'dim_regras_comissao','dim_regras_comissao_faixas','dim_rubricas','dim_cargo_ganhos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_menu ON public.%I FOR ALL TO authenticated
      USING (public.sec_tem_menu(''calculo-comissoes'',''processamento-comissoes'',''cargos-remuneracoes'',''regras-faixas'',''rubricas'',''bases-calculo'',''fontes-calculo'',''fontes-microwork'',''funcionarios''))
      WITH CHECK (public.sec_tem_menu(''calculo-comissoes'',''processamento-comissoes'',''cargos-remuneracoes'',''regras-faixas'',''rubricas'',''bases-calculo'',''fontes-calculo'',''fontes-microwork'',''funcionarios''))', t);
  END LOOP;

  -- Férias: menu "ferias" ou cálculo de comissões (que considera férias)
  FOREACH t IN ARRAY ARRAY['rh_ferias','rh_ferias_importacoes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_menu ON public.%I FOR ALL TO authenticated
      USING (public.sec_tem_menu(''ferias'',''calculo-comissoes'',''processamento-comissoes'',''funcionarios''))
      WITH CHECK (public.sec_tem_menu(''ferias'',''calculo-comissoes'',''processamento-comissoes'',''funcionarios''))', t);
  END LOOP;

  -- Sobreaviso e sua configuração (Regras)
  FOREACH t IN ARRAY ARRAY['rh_sobreaviso_plantao','config_sobreaviso'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_menu ON public.%I FOR ALL TO authenticated
      USING (public.sec_tem_menu(''sobreaviso-plantao'',''regras-faixas''))
      WITH CHECK (public.sec_tem_menu(''sobreaviso-plantao'',''regras-faixas''))', t);
  END LOOP;
END $$;

-- Permissões de comissão: todos leem (AuthContext aplica o escopo), só governança/comissões escrevem
SELECT pg_temp.limpar_policies(ARRAY['permissoes_comissao_modo','permissoes_comissao_valor','permissoes_comissao_escopo',
  'permissoes_comissao_setor_nivel','permissoes_comissao_departamento_nivel']);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['permissoes_comissao_modo','permissoes_comissao_valor','permissoes_comissao_escopo',
                           'permissoes_comissao_setor_nivel','permissoes_comissao_departamento_nivel'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('CREATE POLICY sel_auth ON public.%I FOR SELECT TO authenticated USING (true)', t);
      EXECUTE format('CREATE POLICY escrita_governanca ON public.%I FOR ALL TO authenticated
        USING (public.sec_tem_menu(''grupos'',''permissoes-matriz'',''calculo-comissoes'',''processamento-comissoes''))
        WITH CHECK (public.sec_tem_menu(''grupos'',''permissoes-matriz'',''calculo-comissoes'',''processamento-comissoes''))', t);
    END IF;
  END LOOP;
END $$;

-- Funcionários: leitura para logados (usada em listas/joins); escrita só com menus de RH/comissões
SELECT pg_temp.limpar_policies(ARRAY['dim_funcionarios']);
ALTER TABLE public.dim_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY sel_auth ON public.dim_funcionarios FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON public.dim_funcionarios FOR ALL TO authenticated
  USING (public.sec_tem_menu('funcionarios','cargos-remuneracoes','calculo-comissoes','processamento-comissoes','ferias'))
  WITH CHECK (public.sec_tem_menu('funcionarios','cargos-remuneracoes','calculo-comissoes','processamento-comissoes','ferias'));
