-- ============================================================
-- MÓDULO: Matriz KPIs — Metas digitadas manualmente (ex.: Eficácia da
-- Oficina, Produtividade da Oficina — sem fonte automática de meta).
-- Executar no Supabase SQL Editor
-- ============================================================

-- Uma linha por indicador, por quadro (tituloGerente), por bloco e por mês do ano — o
-- usuário digita a meta na própria Matriz KPIs (coluna Meta, visão Mensal) e ela fica
-- gravada aqui, igual ao padrão já usado em kpi_pesos para a coluna Peso.
CREATE TABLE IF NOT EXISTS kpi_metas_manuais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco          text NOT NULL,
  titulo_gerente text NOT NULL,
  kpi_id         integer NOT NULL,
  ano            integer NOT NULL,
  mes            integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor          numeric NOT NULL,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bloco, titulo_gerente, kpi_id, ano, mes)
);

ALTER TABLE kpi_metas_manuais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON kpi_metas_manuais;
CREATE POLICY "auth_all" ON kpi_metas_manuais FOR ALL TO authenticated USING (true) WITH CHECK (true);
