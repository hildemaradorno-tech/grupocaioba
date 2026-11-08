-- BI Planos de Manutenção — oportunidades gravadas (aba Oportunidades), com a ação e a descrição da ação.
-- Substitui bi_planos_oportunidade_acao (criada vazia em 08/11/2026, só com a ação).
-- Uma linha por oportunidade. chave = identificação montada na tela:
--   'novo|<chassi>|<data da venda>'  ou  'renovacao|<contrato>|<chassi>'.
-- Os dados da oportunidade (tipo, contrato, cliente, chassi, datas, empresa) são gravados junto, para a informação
-- ficar no banco mesmo se o relatório mudar; a tela continua calculando Realizado a partir dos relatórios.
DROP TABLE IF EXISTS bi_planos_oportunidade_acao;

CREATE TABLE IF NOT EXISTS bi_planos_oportunidades (
  chave              text PRIMARY KEY,
  tipo_oportunidade  text NOT NULL CHECK (tipo_oportunidade IN ('Novo', 'Renovação')),
  contrato           text,
  cliente            text,
  chassi             text,
  data_venda         date,
  inicio             date,
  fim                date,
  empresa            text,
  acao_id            bigint REFERENCES bi_planos_acoes(id),
  descricao          text,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  atualizado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_por     text
);

ALTER TABLE bi_planos_oportunidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_menu ON bi_planos_oportunidades;
DROP POLICY IF EXISTS escrita_por_acao ON bi_planos_oportunidades;
CREATE POLICY sel_menu ON bi_planos_oportunidades FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/planos-manutencao'])));
CREATE POLICY escrita_por_acao ON bi_planos_oportunidades FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('bi/planos-manutencao', 'definir_acao')))
  WITH CHECK ((SELECT sec_tem_acao('bi/planos-manutencao', 'definir_acao')));

NOTIFY pgrst, 'reload schema';
