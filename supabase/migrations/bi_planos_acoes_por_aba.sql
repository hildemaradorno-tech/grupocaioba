-- BI Planos de Manutenção: as ações de cada aba passaram para o menu da própria aba no grupo de acesso
-- (Editar e Salvar Metas → Aba Resultado; Informar Ação e Descrição → Aba Oportunidades).
-- As policies de gravação passam a conferir a ação nesse menu.
DROP POLICY IF EXISTS escrita_por_acao ON bi_planos_metas;
CREATE POLICY escrita_por_acao ON bi_planos_metas FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('bi/planos-manutencao/resultado', 'editar_metas')))
  WITH CHECK ((SELECT sec_tem_acao('bi/planos-manutencao/resultado', 'editar_metas')));

DROP POLICY IF EXISTS escrita_por_acao ON bi_planos_oportunidades;
CREATE POLICY escrita_por_acao ON bi_planos_oportunidades FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('bi/planos-manutencao/oportunidades', 'definir_acao')))
  WITH CHECK ((SELECT sec_tem_acao('bi/planos-manutencao/oportunidades', 'definir_acao')));

NOTIFY pgrst, 'reload schema';
