-- ============================================================
-- Campanha Pós-Venda — regras editáveis na aba Regras (BI — Campanha Pós-Venda)
-- Uma linha por mês; um mês sem linha usa a do último mês salvo antes dele
-- (e, sem nenhuma, os valores do regulamento embutidos no sistema).
-- ============================================================
CREATE TABLE IF NOT EXISTS fato_campanha_regras (
  ano            smallint    NOT NULL,
  mes            smallint    NOT NULL,
  dados          jsonb       NOT NULL,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  PRIMARY KEY (ano, mes)
);

ALTER TABLE fato_campanha_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_campanha_regras;
CREATE POLICY "auth_all" ON fato_campanha_regras FOR ALL TO authenticated USING (true) WITH CHECK (true);
