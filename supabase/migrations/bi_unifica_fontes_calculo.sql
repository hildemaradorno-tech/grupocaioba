-- Unifica Fonte BI com Fonte de Cálculo (Comissões): uma tabela só (dim_fontes_calculo).
-- Migration ADITIVA — dim_fontes_bi não é apagada (fica só de backup até validar).

-- 1) Colunas que só o BI usa, opcionais
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS coluna_tipo_os text;
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS coluna_natureza_operacao text;
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS coluna_movimento text;
ALTER TABLE dim_fontes_calculo ADD COLUMN IF NOT EXISTS campo_relacao_funcionario text NOT NULL DEFAULT 'nome_funcionario';

ALTER TABLE dim_fontes_calculo DROP CONSTRAINT IF EXISTS dim_fontes_calculo_campo_relacao_funcionario_check;
ALTER TABLE dim_fontes_calculo ADD CONSTRAINT dim_fontes_calculo_campo_relacao_funcionario_check
  CHECK (campo_relacao_funcionario IN ('nome_funcionario', 'codigo_sistema_bi'));

-- 2) Copia as fontes do BI mantendo o mesmo id (as Medidas BI continuam apontando pro mesmo id)
INSERT INTO dim_fontes_calculo (
  id, nome, codigo, descricao, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho,
  coluna_empresa, coluna_data, coluna_funcionario, coluna_tipo_os, coluna_natureza_operacao,
  coluna_movimento, campo_relacao_funcionario, ativo
)
SELECT
  id, nome, codigo, descricao, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho,
  coluna_empresa, coluna_data, coluna_funcionario, coluna_tipo_os, coluna_natureza_operacao,
  coluna_movimento, campo_relacao_funcionario, ativo
FROM dim_fontes_bi
ON CONFLICT (id) DO NOTHING;

-- 3) Medidas BI passam a referenciar dim_fontes_calculo
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_fonte_bi_id_fkey;
ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_fonte_bi_id_fkey
  FOREIGN KEY (fonte_bi_id) REFERENCES dim_fontes_calculo(id) ON DELETE RESTRICT;
