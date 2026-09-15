-- ============================================================
-- MÓDULO: Matriz KPIs — Pesos dos indicadores (coluna "Peso")
-- Executar no Supabase SQL Editor
-- ============================================================

-- Peso definido manualmente por indicador, por quadro (tituloGerente) e por
-- bloco (bloco3-pos-venda, bloco3-pecas, etc). Guardado como fração (0-1) —
-- mesmo formato já usado em memória pelo campo pesoObj. Compartilhado entre
-- todos os usuários: quem abrir a tela vê o mesmo valor.
CREATE TABLE IF NOT EXISTS kpi_pesos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco          text NOT NULL,
  titulo_gerente text NOT NULL,
  kpi_id         integer NOT NULL,
  peso           numeric NOT NULL CHECK (peso >= 0 AND peso <= 1),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bloco, titulo_gerente, kpi_id)
);

ALTER TABLE kpi_pesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON kpi_pesos;
CREATE POLICY "auth_all" ON kpi_pesos FOR ALL TO authenticated USING (true) WITH CHECK (true);
