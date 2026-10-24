-- ============================================================
-- RLS por perfil nos demais módulos (continuação de fix_seguranca_rls_por_perfil.sql).
-- Cada tabela passa a exigir que o grupo do usuário tenha algum menu do módulo
-- (prefixo de menu_path em permissoes_grupo) ou seja admin.
-- Tabelas de cadastro compartilhado (dim_*, fornecedores, metas) ficam como estão.
-- Reversão: fix_seguranca_rls_modulos_rollback.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.sec_tem_menu_like(VARIADIC prefixos text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sec_is_admin() OR EXISTS (
    SELECT 1 FROM public.permissoes_grupo p, unnest(prefixos) x
    WHERE p.grupo_id = public.sec_grupo_id() AND p.menu_path LIKE x || '%'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.sec_tem_menu_like(text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sec_tem_menu_like(text[]) TO authenticated, service_role;

-- aplica_modulo(tabelas, prefixos): leitura e escrita só para quem tem menu do módulo
CREATE OR REPLACE FUNCTION pg_temp.aplica_modulo(tabs text[], prefixos text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE t text; r record; lista text;
BEGIN
  SELECT string_agg(quote_literal(x), ',') INTO lista FROM unnest(prefixos) x;
  FOREACH t IN ARRAY tabs LOOP
    IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY por_modulo ON public.%I FOR ALL TO authenticated
                    USING (public.sec_tem_menu_like(%s)) WITH CHECK (public.sec_tem_menu_like(%s))', t, lista, lista);
  END LOOP;
END $$;

-- leitura para logados (AuthContext/escopos), escrita só governança
CREATE OR REPLACE FUNCTION pg_temp.leitura_livre_escrita_menu(tabs text[], prefixos text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE t text; r record; lista text;
BEGIN
  SELECT string_agg(quote_literal(x), ',') INTO lista FROM unnest(prefixos) x;
  FOREACH t IN ARRAY tabs LOOP
    IF to_regclass('public.'||t) IS NULL THEN CONTINUE; END IF;
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY sel_auth ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY escrita_por_menu ON public.%I FOR ALL TO authenticated
                    USING (public.sec_tem_menu_like(%s)) WITH CHECK (public.sec_tem_menu_like(%s))', t, lista, lista);
  END LOOP;
END $$;

-- Garantias
SELECT pg_temp.aplica_modulo(ARRAY['gar_configuracoes','gar_garantias','gar_garantias_log','gar_garantias_respostas',
  'gar_modelos_nota_debito','gar_notas_debito','gar_titulos_observacoes','dim_tipo_titulo_garantia'],
  ARRAY['garantia','bi/garantias']);

-- TruckPag e Honda Contas a Receber
SELECT pg_temp.aplica_modulo(ARRAY['truckpag_baixas_titulos','truckpag_config_conciliacao','truckpag_config_tipos_saldo',
  'truckpag_creditos_nao_identificados','truckpag_repasses','truckpag_titulos'], ARRAY['truckpag','bi/truckpag']);
SELECT pg_temp.aplica_modulo(ARRAY['honda_contas_receber_anotacoes','honda_contas_receber_status'], ARRAY['honda']);

-- Gestão de Projetos (cadastros auxiliares proj_responsaveis/empresas/status/sistemas/areas
-- são usados por outros módulos e ficam abertos a logados)
SELECT pg_temp.aplica_modulo(ARRAY['proj_projetos','proj_tarefas','proj_tarefas_dependencias','proj_custos','proj_custos_pagamentos',
  'proj_fases','proj_atas_reuniao','proj_ata_locais','proj_deliberacoes','proj_manifestacoes','proj_manifestacao_convidados',
  'proj_manifestacao_lembretes','proj_templates'], ARRAY['projetos','bi/projetos']);

-- Treinamentos
SELECT pg_temp.aplica_modulo(ARRAY['trein_cargos','trein_categorias','trein_curso_agrupamentos','trein_curso_cargos',
  'trein_cursos','trein_organograma','trein_sistemas'], ARRAY['treinamentos']);

-- Controladoria
SELECT pg_temp.aplica_modulo(ARRAY['ctb_centros_resultado','ctb_dre_linhas','ctb_orcamento','ctb_plano_contas'],
  ARRAY['controladoria','integracoes/controladoria']);

-- Auditoria O.S. Aberta
SELECT pg_temp.aplica_modulo(ARRAY['aud_agendamentos','aud_auditoria_os','aud_auditoria_reaberturas','aud_auditorias',
  'aud_configuracoes','aud_responsaveis','aud_situacoes'], ARRAY['auditoria']);

-- BPM / NF-e
SELECT pg_temp.aplica_modulo(ARRAY['bpm_audit_log','bpm_comments','bpm_process_definitions','bpm_process_instances','bpm_tasks',
  'nfe_etapas','nfe_solicitacao_historico','nfe_solicitacoes'], ARRAY['bpm']);

-- BI Campanha Pós-Venda
SELECT pg_temp.aplica_modulo(ARRAY['fato_campanha_diario','fato_campanha_fechamento','fato_campanha_lancamentos',
  'fato_campanha_metas','fato_campanha_regras'], ARRAY['bi/campanha']);

-- KPI: sincronização e cache (config); metas manuais/pesos leitura livre, escrita por menu
SELECT pg_temp.aplica_modulo(ARRAY['kpi_cache_extrator','kpi_cache_planilhas','kpi_sync_config','kpi_sync_datas_especificas',
  'kpi_sync_execucoes','kpi_sync_horarios_semana'], ARRAY['kpi','integracoes']);
SELECT pg_temp.leitura_livre_escrita_menu(ARRAY['kpi_metas_manuais','kpi_pesos'], ARRAY['kpi','integracoes','metas']);

-- Governança e Ecossistema
SELECT pg_temp.aplica_modulo(ARRAY['governanca_grupo_menus','governanca_grupos_acesso','governanca_menus',
  'governanca_perfil_menus','governanca_perfis'], ARRAY['governanca','grupos','permissoes-matriz']);
SELECT pg_temp.aplica_modulo(ARRAY['ecossistema_departamentos'], ARRAY['ecossistema']);

-- Escopos de acesso (lidos pelo AuthContext de todo usuário), escrita só governança
SELECT pg_temp.leitura_livre_escrita_menu(ARRAY['permissoes_depto_grupo','permissoes_depto_grupo_auditoria',
  'permissoes_empresa_grupo','permissoes_empresa_grupo_auditoria'], ARRAY['grupos','permissoes-matriz','governanca']);
