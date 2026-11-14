-- ============================================================
-- Pós-Vendas › Indicadores de Produtividade — Regras de cores dos indicadores (engrenagem da tela).
-- Por ano, mês e indicador (eficiencia / eficacia / produtividade): dois limites em fração (0,80 = 80%)
-- dividem o valor em 3 faixas — abaixo do limite inferior, entre os limites, acima do superior —
-- e cada faixa recebe uma cor (verde / amarelo / vermelho). Mês sem regra = faixas padrão do Power BI.
-- Ver: quem tem o menu. Gravar: só quem tem a ação "regras_cores".
-- ============================================================

CREATE TABLE IF NOT EXISTS pv_prod_regras_cor (
  ano             int  NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes             int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  indicador       text NOT NULL CHECK (indicador IN ('eficiencia', 'eficacia', 'produtividade')),
  limite_inf      numeric(8,4) NOT NULL CHECK (limite_inf >= 0),
  limite_sup      numeric(8,4) NOT NULL CHECK (limite_sup >= 0),
  cor_abaixo      text NOT NULL CHECK (cor_abaixo IN ('verde', 'amarelo', 'vermelho')),
  cor_meio        text NOT NULL CHECK (cor_meio   IN ('verde', 'amarelo', 'vermelho')),
  cor_acima       text NOT NULL CHECK (cor_acima  IN ('verde', 'amarelo', 'vermelho')),
  atualizado_em   timestamptz,
  atualizado_por  text,
  PRIMARY KEY (ano, mes, indicador),
  CHECK (limite_inf <= limite_sup)
);

ALTER TABLE pv_prod_regras_cor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leitura_por_menu ON pv_prod_regras_cor;
CREATE POLICY leitura_por_menu ON pv_prod_regras_cor FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['pos-vendas/'::text])));
DROP POLICY IF EXISTS escrita_por_acao ON pv_prod_regras_cor;
CREATE POLICY escrita_por_acao ON pv_prod_regras_cor FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('pos-vendas/produtividade', 'regras_cores')))
  WITH CHECK ((SELECT sec_tem_acao('pos-vendas/produtividade', 'regras_cores')));

NOTIFY pgrst, 'reload schema';
