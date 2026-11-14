-- BI Possibilidades: a Medida "Venda de Peças" (slot realPecas) não tinha regra nenhuma — as
-- devoluções do RPR001 (NF_Origem contendo "DEV") entravam positivas e SOMAVAM no Real em vez de
-- descontar (ex.: Balcão 01–12/11/2026 dava 587.259,77 = vendas 585.559,77 + devolução 1.700,00;
-- o Dealer.net "Total Vendas - Devoluções" dá 583.859,77). Mesma regra que a "Margem de Peças" já usa.
WITH nova AS (
  INSERT INTO dim_medidas_bi_regras (medida_bi_id, ordem, tipo_acao, coluna_alvo, condicao_logica, ativo)
  SELECT m.id, 0, 'INVERTER_SINAL', NULL, 'E', true
  FROM dim_medidas_bi m
  WHERE m.slot_faturamento = 'realPecas'
    AND NOT EXISTS (SELECT 1 FROM dim_medidas_bi_regras r WHERE r.medida_bi_id = m.id AND r.tipo_acao = 'INVERTER_SINAL')
  RETURNING id
)
INSERT INTO dim_medidas_bi_regra_condicoes (regra_id, ordem, coluna, operador, valor)
SELECT id, 0, 'NF_Origem', 'CONTEM', 'DEV' FROM nova;

-- Correção (mesmo dia): no RPR001 a devolução vem em NaturezaOperacao = 'DVE' (venda = 'VEN') e
-- NF_Origem é 'BLC' nas duas — "NF_Origem contém DEV" nunca casava. Vale pras duas Medidas de peças
-- (Venda e Margem de Peças, que também somava a margem da devolução).
UPDATE dim_medidas_bi_regra_condicoes c
SET coluna = 'NaturezaOperacao', operador = 'IGUAL', valor = 'DVE'
FROM dim_medidas_bi_regras r
JOIN dim_medidas_bi m ON m.id = r.medida_bi_id
WHERE c.regra_id = r.id
  AND m.slot_faturamento IN ('realPecas', 'margemPecas')
  AND r.tipo_acao = 'INVERTER_SINAL'
  AND c.coluna = 'NF_Origem' AND c.operador = 'CONTEM' AND c.valor = 'DEV';
