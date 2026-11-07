-- Permissão por ação (permissoes_grupo_acoes), no mesmo modelo do sec_tem_menu: admin sempre pode.
CREATE OR REPLACE FUNCTION public.sec_tem_acao(p_menu text, p_acao text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.sec_is_admin() OR EXISTS (
    SELECT 1 FROM public.permissoes_grupo_acoes a
    WHERE a.grupo_id = public.sec_grupo_id() AND a.menu_path = p_menu AND a.acao = p_acao
  )
$$;
REVOKE EXECUTE ON FUNCTION public.sec_tem_acao(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sec_tem_acao(text, text) TO authenticated, service_role;

-- BI Planos de Manutenção: ver as metas = quem tem o menu; gravar = só quem tem a ação "editar_metas".
DROP POLICY IF EXISTS escrita_por_menu ON bi_planos_metas;
DROP POLICY IF EXISTS escrita_por_acao ON bi_planos_metas;
CREATE POLICY escrita_por_acao ON bi_planos_metas FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('bi/planos-manutencao', 'editar_metas')))
  WITH CHECK ((SELECT sec_tem_acao('bi/planos-manutencao', 'editar_metas')));

NOTIFY pgrst, 'reload schema';
