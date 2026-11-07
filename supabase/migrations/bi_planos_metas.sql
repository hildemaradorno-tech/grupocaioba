-- BI Planos de Manutenção: metas dos indicadores (velocímetros) do Resumo, editadas na engrenagem ao lado do
-- botão Atualizar. Uma linha por indicador (chave = a do INFO_RESUMO em planosManutencaoTextos.js).
-- Só Contratos novos (gaugeNovos) e Contratos renovados (gaugeRenovados) são gravados; a meta do
-- Potencial de contratos é calculada na tela a partir dessas duas.
CREATE TABLE IF NOT EXISTS bi_planos_metas (
  indicador       text PRIMARY KEY,
  meta            numeric(6,2) NOT NULL CHECK (meta >= 0 AND meta <= 100),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_por  text
);

ALTER TABLE bi_planos_metas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON bi_planos_metas;
DROP POLICY IF EXISTS escrita_por_menu ON bi_planos_metas;
CREATE POLICY sel_auth ON bi_planos_metas FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON bi_planos_metas FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/planos-manutencao'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/planos-manutencao'])));

-- Metas iniciais (as mesmas que a tela usa enquanto a tabela não existe).
INSERT INTO bi_planos_metas (indicador, meta) VALUES
  ('gaugeNovos', 50), ('gaugeRenovados', 80)
ON CONFLICT (indicador) DO NOTHING;

NOTIFY pgrst, 'reload schema';
