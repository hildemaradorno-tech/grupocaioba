-- ============================================================
-- MÓDULO: Garantias DAF — Metas dos indicadores do SETOR GARANTIA (Matriz KPIs › Bloco 3 - Serviços)
-- Engrenagem das Regras → "Metas — Setor Garantia". Meta POR EMPRESA (CAMPO GRANDE, DOURADOS, TRÊS LAGOAS,
-- CHAPADÃO DO SUL), com meta geral (ano = 0, mes = 0) e, se quiser, meta por mês (ano/mes); mês sem meta
-- própria usa a geral. "Todas as empresas" na Matriz = soma das metas das lojas.
-- indicador: digitacaoAtrasada | aguardandoForaPrazo | aprovadaSemFaturamento | recusadaForaPrazo | titulosVencidos
-- meta = quantidade (O.S. / títulos), menor é melhor.
-- ============================================================

CREATE TABLE IF NOT EXISTS gar_metas_indicadores (
  empresa         text    NOT NULL CHECK (empresa IN ('CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL')),
  ano             int     NOT NULL CHECK (ano = 0 OR ano BETWEEN 2000 AND 2100),
  mes             int     NOT NULL CHECK (mes BETWEEN 0 AND 12),
  indicador       text    NOT NULL CHECK (indicador IN ('digitacaoAtrasada', 'aguardandoForaPrazo', 'aprovadaSemFaturamento', 'recusadaForaPrazo', 'titulosVencidos')),
  meta            numeric NOT NULL CHECK (meta >= 0),
  atualizado_em   timestamptz,
  atualizado_por  text,
  PRIMARY KEY (empresa, ano, mes, indicador),
  CONSTRAINT gar_metas_geral_ou_mes CHECK ((ano = 0 AND mes = 0) OR (ano > 0 AND mes BETWEEN 1 AND 12))
);

-- Mesma trava das demais tabelas gar_*: só quem tem menu de garantias
ALTER TABLE gar_metas_indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON gar_metas_indicadores;
CREATE POLICY "por_modulo" ON gar_metas_indicadores FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])))
  WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])));

NOTIFY pgrst, 'reload schema';
