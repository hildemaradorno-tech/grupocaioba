-- Terceiro tipo de faixa: "Valor Fixo por Meta Atingida" — em vez de aplicar um % sobre algo,
-- paga um valor FIXO em R$ conforme a faixa de % de meta atingida (ex: >=80% paga R$ 200,00
-- fixos, >=90% paga R$ 300,00, etc.) — sem depender de nenhuma outra política. A faixa continua
-- usando a coluna `percentual` de dim_regras_comissao_faixas, só que reinterpretada como R$ fixo
-- (não como percentual) quando tipo_faixa = 'VALOR_FIXO_META'.
ALTER TABLE dim_regras_comissao DROP CONSTRAINT IF EXISTS dim_regras_comissao_tipo_faixa_check;
ALTER TABLE dim_regras_comissao ADD CONSTRAINT dim_regras_comissao_tipo_faixa_check
  CHECK (tipo_faixa IN ('VALOR', 'PERCENTUAL_META', 'VALOR_FIXO_META'));
