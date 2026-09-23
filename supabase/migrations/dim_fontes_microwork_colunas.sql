-- Fonte MicroWork: mesmo mapeamento de colunas que Fonte de Cálculo (empresa/data/funcionário) já
-- usa pro SharePoint — aqui aponta pro nome do campo dentro do JSON de resposta do MicroWork.
ALTER TABLE dim_fontes_microwork ADD COLUMN IF NOT EXISTS coluna_empresa     text;
ALTER TABLE dim_fontes_microwork ADD COLUMN IF NOT EXISTS coluna_data        text;
ALTER TABLE dim_fontes_microwork ADD COLUMN IF NOT EXISTS coluna_funcionario text;
