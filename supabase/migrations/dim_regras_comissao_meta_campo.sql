-- Algumas metas publicadas (Consultor, Mecânico, Funilaria) guardam a meta já separada em
-- meta_faturamento (total) + meta_pecas + meta_servicos dentro do mesmo registro. Até aqui toda
-- Regra por Meta sempre comparava com o total — meta_campo deixa escolher comparar só com a
-- parte de Peças ou só de Serviços (ex: comissão sobre Peças da Oficina não deve contar a meta de
-- Serviços dos consultores na comparação).
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS meta_campo text NOT NULL DEFAULT 'total'
  CHECK (meta_campo IN ('total', 'pecas', 'servicos'));
