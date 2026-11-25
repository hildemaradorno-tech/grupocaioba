-- ============================================================
-- Garantias DAF — Meta do indicador "Tempo de garantia em aberto" (Dashboard da aba Com Garantista).
-- Média de dias em aberto das O.S. (da criação da O.S. até hoje). Meta em dias, cadastrada ano a ano
-- (engrenagem → Meta — Tempo de garantia em aberto):
--   mes 1..12 = meta do mês · mes 0 = meta anual (vale para os meses em branco daquele ano)
-- O Dashboard usa a meta do mês atual; mês sem meta usa a anual.
-- ============================================================

CREATE TABLE IF NOT EXISTS gar_metas_tempo_aberto (
  ano             int NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes             int NOT NULL CHECK (mes BETWEEN 0 AND 12),
  meta_dias       numeric(6,1) CHECK (meta_dias > 0),
  atualizado_em   timestamptz,
  atualizado_por  text,
  PRIMARY KEY (ano, mes)
);

-- Mesma trava das demais tabelas gar_*: só quem tem menu de garantias
ALTER TABLE gar_metas_tempo_aberto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON gar_metas_tempo_aberto;
CREATE POLICY "por_modulo" ON gar_metas_tempo_aberto FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])))
  WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])));

NOTIFY pgrst, 'reload schema';
