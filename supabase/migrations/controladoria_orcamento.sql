-- Controladoria → aba Orçamento: valor orçado por conta analítica do Plano de Contas, mês/ano e
-- (opcional) Centro de Resultado. centro_resultado_id NULL = orçamento geral (sem centro).
CREATE TABLE IF NOT EXISTS ctb_orcamento (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                  integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  mes                  smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  conta_id             uuid NOT NULL REFERENCES ctb_plano_contas(id) ON DELETE CASCADE,
  centro_resultado_id  uuid REFERENCES ctb_centros_resultado(id) ON DELETE CASCADE,
  valor                numeric(15,2) NOT NULL DEFAULT 0,
  atualizado_por       text,
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);

-- Uma linha por (ano, mês, conta, centro) — centro nulo tratado como um valor próprio.
CREATE UNIQUE INDEX IF NOT EXISTS ctb_orcamento_chave_idx ON ctb_orcamento
  (ano, mes, conta_id, COALESCE(centro_resultado_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS ctb_orcamento_ano_centro_idx ON ctb_orcamento (ano, centro_resultado_id);

ALTER TABLE ctb_orcamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON ctb_orcamento;
CREATE POLICY "auth_all" ON ctb_orcamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- View para Power BI: uma linha por mês/conta/centro, com data (1º dia do mês) pra relacionar
-- com calendário, e conta/linha da DRE/centro/empresa já resolvidos por nome.
CREATE OR REPLACE VIEW vw_ctb_orcamento AS
SELECT
  o.id                     AS orcamento_id,
  o.ano,
  o.mes,
  make_date(o.ano, o.mes, 1) AS data_competencia,
  o.valor,
  o.conta_id,
  c.codigo                 AS conta_codigo,
  c.descricao              AS conta_descricao,
  c.natureza               AS conta_natureza,
  l.id                     AS linha_dre_id,
  l.ordem                  AS linha_dre_ordem,
  l.descricao              AS linha_dre,
  l.sinal                  AS linha_dre_sinal,
  o.centro_resultado_id,
  cr.codigo                AS centro_resultado_codigo,
  COALESCE(cr.descricao, '(Geral)') AS centro_resultado,
  e.id                     AS empresa_id,
  COALESCE(e.empresa_fantasia, e.nome_empresa) AS empresa,
  d.nome_departamento      AS departamento,
  o.atualizado_por,
  o.atualizado_em
FROM ctb_orcamento o
JOIN ctb_plano_contas c ON c.id = o.conta_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id
LEFT JOIN ctb_centros_resultado cr ON cr.id = o.centro_resultado_id
LEFT JOIN dim_empresas e ON e.id = cr.empresa_id
LEFT JOIN dim_departamentos d ON d.id = cr.departamento_id;
