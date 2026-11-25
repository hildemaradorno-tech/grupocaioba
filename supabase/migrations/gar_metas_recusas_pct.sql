-- ============================================================
-- Garantias DAF — Meta do indicador "Recusas de garantia" (Dashboard da aba Com Garantista), 25/11/2026.
-- % das garantias em aberto (quantidade) que estão em Recusas. Meta = % máximo, cadastrada ano a ano
-- (engrenagem → Meta — Recusas de garantia):
--   mes 1..12 = meta do mês · mes 0 = meta anual (vale para os meses em branco daquele ano)
-- O Dashboard usa a meta do mês atual; mês sem meta usa a anual. Verde até a meta, vermelho acima.
-- ============================================================

CREATE TABLE IF NOT EXISTS gar_metas_recusas_pct (
  ano             int NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes             int NOT NULL CHECK (mes BETWEEN 0 AND 12),
  meta_pct        numeric(5,1) CHECK (meta_pct > 0 AND meta_pct <= 100),
  atualizado_em   timestamptz,
  atualizado_por  text,
  PRIMARY KEY (ano, mes)
);

-- Mesma trava das demais tabelas gar_*: só quem tem menu de garantias
ALTER TABLE gar_metas_recusas_pct ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON gar_metas_recusas_pct;
CREATE POLICY "por_modulo" ON gar_metas_recusas_pct FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])))
  WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])));

NOTIFY pgrst, 'reload schema';
