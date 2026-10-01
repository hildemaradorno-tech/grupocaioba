-- Desconto sobre o valor apurado da Base de Cálculo (ex: 14,25% de imposto de venda) — a Regra
-- passa a trabalhar com o valor LÍQUIDO (apurado menos esse %), tanto pra comparar com as
-- faixas/Meta quanto pra multiplicar na comissão. 0 (padrão) = sem desconto, comportamento
-- igual ao de antes.
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS desconto_percentual numeric NOT NULL DEFAULT 0;
