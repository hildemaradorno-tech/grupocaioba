-- Coluna que classifica cada linha (ex: "VENDA POR O.S", "DEVOLUÇÃO...") — quando preenchida,
-- a calculadora em Cálculo de Comissões mostra o total de Venda e de Devolução separados, além
-- do total usado como base (independente de "Regras de Cálculo" e de "Coluna do Valor" ter uma
-- ou mais colunas somadas).
ALTER TABLE dim_bases_calculo ADD COLUMN IF NOT EXISTS coluna_tipo_movimento text;
