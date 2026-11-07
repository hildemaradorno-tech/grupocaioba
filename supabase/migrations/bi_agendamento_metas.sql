-- BI Agendamento de Serviços (Mesa de Agendamento): metas dos indicadores (velocímetros), editadas na
-- engrenagem ao lado do botão Atualizar. Uma linha por indicador (chave = a do INFO em agendamentoServicosTextos.js).
-- menor_melhor = quanto menor, melhor (Taxa de No-show): atingimento = meta ÷ valor.
CREATE TABLE IF NOT EXISTS bi_agendamento_metas (
  indicador       text PRIMARY KEY,
  meta            numeric(6,2) NOT NULL CHECK (meta >= 0 AND meta <= 100),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_por  text
);

ALTER TABLE bi_agendamento_metas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON bi_agendamento_metas;
DROP POLICY IF EXISTS escrita_por_menu ON bi_agendamento_metas;
CREATE POLICY sel_auth ON bi_agendamento_metas FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON bi_agendamento_metas FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/agendamento-servicos'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/agendamento-servicos'])));

-- Metas atuais (as que estavam fixas no código).
INSERT INTO bi_agendamento_metas (indicador, meta) VALUES
  ('taxaAgendamento', 80), ('taxaConversao', 80), ('taxaNoShow', 15),
  ('agTaxaConversao', 80), ('agTaxaConversaoAtivo', 80), ('agTaxaConversaoPassivo', 80), ('agTaxaNoShow', 15),
  ('gaugeAgendamentoOs', 80), ('gaugeAtivo', 80), ('gaugePassivo', 80)
ON CONFLICT (indicador) DO NOTHING;

NOTIFY pgrst, 'reload schema';
