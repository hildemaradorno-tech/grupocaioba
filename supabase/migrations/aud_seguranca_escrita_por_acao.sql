-- ============================================================
-- Auditoria O.S. Aberta — gravação conferida pela AÇÃO do grupo (mesmo modelo do BI Planos de Manutenção)
-- Antes: qualquer pessoa com algum menu de auditoria gravava estas tabelas fora da tela (policy "por_modulo").
-- Agora: VER = quem tem menu de auditoria; GRAVAR = Admin ou grupo com a ação do botão que grava.
--   aud_metas_indicadores → ação 'metas_indicadores'     (engrenagem → Metas dos indicadores)
--   aud_configuracoes     → 'metas_indicadores' OU 'programar_auditorias' (meta geral e Regra de reabertura
--                           ficam na mesma linha 'geral'; cada botão grava a sua parte)
--   aud_agendamentos      → ação 'programar_auditorias'   (engrenagem → Programar auditorias)
--   aud_situacoes         → ação 'cadastrar_situacoes'    (engrenagem → Situações de auditoria)
-- O backend (agendamento automático, KPI) usa a service role e não passa por RLS.
-- Depende de sec_tem_acao(menu, acao), criada em bi_planos_metas_acao.sql. Rollback: aud_seguranca_escrita_por_acao_rollback.sql
-- ============================================================

-- aud_metas_indicadores
DROP POLICY IF EXISTS "por_modulo" ON aud_metas_indicadores;
DROP POLICY IF EXISTS leitura_por_modulo ON aud_metas_indicadores;
DROP POLICY IF EXISTS escrita_por_acao ON aud_metas_indicadores;
CREATE POLICY leitura_por_modulo ON aud_metas_indicadores FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])));
CREATE POLICY escrita_por_acao ON aud_metas_indicadores FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('auditoria-os-aberto', 'metas_indicadores')))
  WITH CHECK ((SELECT sec_tem_acao('auditoria-os-aberto', 'metas_indicadores')));

-- aud_configuracoes
DROP POLICY IF EXISTS "por_modulo" ON aud_configuracoes;
DROP POLICY IF EXISTS leitura_por_modulo ON aud_configuracoes;
DROP POLICY IF EXISTS escrita_por_acao ON aud_configuracoes;
CREATE POLICY leitura_por_modulo ON aud_configuracoes FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])));
CREATE POLICY escrita_por_acao ON aud_configuracoes FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('auditoria-os-aberto', 'metas_indicadores')) OR (SELECT sec_tem_acao('auditoria-os-aberto', 'programar_auditorias')))
  WITH CHECK ((SELECT sec_tem_acao('auditoria-os-aberto', 'metas_indicadores')) OR (SELECT sec_tem_acao('auditoria-os-aberto', 'programar_auditorias')));

-- aud_agendamentos
DROP POLICY IF EXISTS "por_modulo" ON aud_agendamentos;
DROP POLICY IF EXISTS leitura_por_modulo ON aud_agendamentos;
DROP POLICY IF EXISTS escrita_por_acao ON aud_agendamentos;
CREATE POLICY leitura_por_modulo ON aud_agendamentos FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])));
CREATE POLICY escrita_por_acao ON aud_agendamentos FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('auditoria-os-aberto', 'programar_auditorias')))
  WITH CHECK ((SELECT sec_tem_acao('auditoria-os-aberto', 'programar_auditorias')));

-- aud_situacoes
DROP POLICY IF EXISTS "por_modulo" ON aud_situacoes;
DROP POLICY IF EXISTS leitura_por_modulo ON aud_situacoes;
DROP POLICY IF EXISTS escrita_por_acao ON aud_situacoes;
CREATE POLICY leitura_por_modulo ON aud_situacoes FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])));
CREATE POLICY escrita_por_acao ON aud_situacoes FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('auditoria-os-aberto', 'cadastrar_situacoes')))
  WITH CHECK ((SELECT sec_tem_acao('auditoria-os-aberto', 'cadastrar_situacoes')));

NOTIFY pgrst, 'reload schema';
