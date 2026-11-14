-- ============================================================
-- MÓDULO: Garantias DAF — Regras do Sistema por mês, cadastradas ano a ano
-- (engrenagem → Regras — Na Oficina / Com Garantista / Títulos a Receber).
-- Cada O.S./título usa a regra do MÊS EM QUE A CONTAGEM COMEÇA:
--   dias_oficina   → mês da criação da OS
--   dias_digitacao → mês do fechamento da OS
--   dias_solucao / dias_solucao_por_tipo → mês da digitação da garantia (criado_em)
--   dias_recusa    → mês da Data Final Avaliação (sem ela, Data SG)
--   dias_nf_envio  → mês da emissão da NF
-- NULL = mês sem regra própria → vale a regra geral (gar_configuracoes).
-- Prazo de solução: tipo no mês → geral do mês → tipo geral → geral.
-- ============================================================

CREATE TABLE IF NOT EXISTS gar_regras_mes (
  ano                    int NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes                    int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dias_oficina           int CHECK (dias_oficina > 0),
  dias_digitacao         int CHECK (dias_digitacao > 0),
  dias_solucao           int CHECK (dias_solucao > 0),
  dias_solucao_por_tipo  jsonb,
  dias_recusa            int CHECK (dias_recusa > 0),
  dias_nf_envio          int CHECK (dias_nf_envio > 0),
  atualizado_em          timestamptz,
  atualizado_por         text,
  PRIMARY KEY (ano, mes)
);

-- Mesma trava das demais tabelas gar_*: só quem tem menu de garantias
ALTER TABLE gar_regras_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON gar_regras_mes;
CREATE POLICY "por_modulo" ON gar_regras_mes FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])))
  WITH CHECK ((SELECT sec_tem_menu_like(VARIADIC ARRAY['garantia'::text, 'bi/garantias'::text])));

NOTIFY pgrst, 'reload schema';
