-- Desconto sobre o valor apurado da Base de Cálculo (ex: 14,25% de imposto de venda) — vale
-- sempre que essa Base for usada (política normal com % fixo, R$ Valor, ou qualquer Regra por
-- faixa em cima dela), tirando esse % do valor bruto lido antes de qualquer cálculo. 0 (padrão)
-- = sem desconto, comportamento igual ao de antes.
ALTER TABLE dim_bases_calculo ADD COLUMN IF NOT EXISTS desconto_percentual numeric NOT NULL DEFAULT 0;
