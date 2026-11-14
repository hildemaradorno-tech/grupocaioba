-- BI Possibilidades › aba Evolução: Coef. Serviços = Real Serviços ÷ Horas Vendidas. Horas vendidas
-- vêm do ROF042 (coluna "Hr. Vend."), mesma Fonte do modo Oficina. Linhas "Produtivo Não Associado"
-- ficam fora das horas (mesma regra da Matriz KPIs/Campanha — sharepointExtractor.parseROF042Buffer).
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_slot_faturamento_check;
ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_slot_faturamento_check
  CHECK (slot_faturamento = ANY (ARRAY['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass',
                                       'prodPecas', 'prodServicos', 'prodMargemServicos', 'prodPass', 'horasVendidas']));

INSERT INTO dim_medidas_bi (nome, codigo, fonte_bi_id, coluna_valor, tipo_agregacao, slot_faturamento, ativo)
SELECT 'Horas Vendidas', 'HORAS_VENDIDAS', f.id, 'Hr. Vend.', 'SOMA', 'horasVendidas', true
FROM dim_fontes_calculo f
WHERE f.codigo = 'ROF042_PRODUTIVO'
  AND NOT EXISTS (SELECT 1 FROM dim_medidas_bi m WHERE m.codigo = 'HORAS_VENDIDAS');

WITH nova AS (
  INSERT INTO dim_medidas_bi_regras (medida_bi_id, ordem, tipo_acao, coluna_alvo, condicao_logica, ativo)
  SELECT m.id, 0, 'FILTRAR', NULL, 'E', true
  FROM dim_medidas_bi m
  WHERE m.codigo = 'HORAS_VENDIDAS'
    AND NOT EXISTS (SELECT 1 FROM dim_medidas_bi_regras r WHERE r.medida_bi_id = m.id)
  RETURNING id
)
INSERT INTO dim_medidas_bi_regra_condicoes (regra_id, ordem, coluna, operador, valor)
SELECT id, 0, 'Produtivo', 'NAO_CONTEM', 'PRODUTIVO NAO ASSOCIADO' FROM nova;
