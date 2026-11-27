-- BI Agendamento de Serviços (Mesa de Agendamento) — metas dos indicadores mês a mês (engrenagem › Metas dos indicadores).
-- Uma meta por indicador + ano + mês. Mês sem meta aqui usa a meta padrão do indicador (tabela bi_agendamento_metas).
CREATE TABLE IF NOT EXISTS bi_agendamento_metas_mes (
  indicador       text NOT NULL,
  ano             int  NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes             int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta            numeric(6,2) NOT NULL CHECK (meta >= 0 AND meta <= 100),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_por  text,
  PRIMARY KEY (indicador, ano, mes)
);

ALTER TABLE bi_agendamento_metas_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON bi_agendamento_metas_mes;
DROP POLICY IF EXISTS escrita_por_menu ON bi_agendamento_metas_mes;
CREATE POLICY sel_auth ON bi_agendamento_metas_mes FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON bi_agendamento_metas_mes FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/agendamento-servicos'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/agendamento-servicos'])));

NOTIFY pgrst, 'reload schema';
