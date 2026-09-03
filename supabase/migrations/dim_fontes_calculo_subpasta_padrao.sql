-- Generaliza a subpasta de "só ano" para um nome/template configurável (ex: "Ano {ano}",
-- "Base {ano} - Nova", ou literalmente "{ano}" pra manter o comportamento atual). NULL nas
-- linhas já existentes é tratado como "{ano}" no código, sem precisar de UPDATE retroativo.
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS subpasta_padrao text;
