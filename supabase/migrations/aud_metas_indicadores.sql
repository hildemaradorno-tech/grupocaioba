-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta — Metas dos indicadores por mês, cadastradas ano a ano
-- (engrenagem → Metas dos indicadores). Percentual máximo aceito do total em aberto, igual para todas
-- as empresas. O Dashboard usa a meta do mês/ano da data da auditoria; mês sem meta cai na meta geral
-- (aud_configuracoes.meta_pendentes_pct / meta_mais30_pct). NULL = sem meta naquele mês.
-- ============================================================

CREATE TABLE IF NOT EXISTS aud_metas_indicadores (
  ano                 int NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes                 int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_pendentes_pct  numeric(5,2) CHECK (meta_pendentes_pct BETWEEN 0 AND 100),
  meta_mais30_pct     numeric(5,2) CHECK (meta_mais30_pct BETWEEN 0 AND 100),
  atualizado_em       timestamptz,
  atualizado_por      text,
  PRIMARY KEY (ano, mes)
);

-- Mesma trava das demais tabelas aud_*: só quem tem algum menu de auditoria
ALTER TABLE aud_metas_indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON aud_metas_indicadores;
CREATE POLICY "por_modulo" ON aud_metas_indicadores FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])))
  WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['auditoria'::text])));

NOTIFY pgrst, 'reload schema';
