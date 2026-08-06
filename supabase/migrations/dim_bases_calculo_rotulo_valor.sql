-- Rótulo customizado pra exibir o valor calculado por essa Base (ex: "Valor Peças"),
-- independente do nome técnico/código usado na lógica de cálculo.
ALTER TABLE dim_bases_calculo ADD COLUMN IF NOT EXISTS rotulo_valor text;
