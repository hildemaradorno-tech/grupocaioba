-- Rollback de aud_seguranca_escrita_por_acao.sql — volta à policy "por_modulo" (quem tem menu de auditoria vê e grava)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aud_metas_indicadores', 'aud_configuracoes', 'aud_agendamentos', 'aud_situacoes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS leitura_por_modulo ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS escrita_por_acao ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "por_modulo" ON %I', t);
    EXECUTE format($p$CREATE POLICY "por_modulo" ON %I FOR ALL TO authenticated
      USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])))
      WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])))$p$, t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
