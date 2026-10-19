-- BI Possibilidades › Oficina › Total › Visualizar por Produtivo: valores pelo MECÂNICO que
-- executou o serviço (coluna "Produtivo" do ROF042 — Faturamento de Serviços por Produtivo), não
-- pelo consultor/Tipo de OS. Novos Slots só desse modo (não entram nas outras abas) + a Fonte
-- ROF042 + 4 Medidas.
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_slot_faturamento_check;
ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_slot_faturamento_check
  CHECK (slot_faturamento = ANY (ARRAY['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass',
                                       'prodPecas', 'prodServicos', 'prodMargemServicos', 'prodPass']));

-- Fonte: arquivos mensais "ROF042_FaturamentoServicosProdutivos_Excel AAAA.MM.xlsx", cabeçalho na
-- 2ª linha (linha 1 em branco).
INSERT INTO dim_fontes_calculo (nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho,
  coluna_empresa, coluna_data, coluna_funcionario, campo_relacao_funcionario, coluna_tipo_os, ativo)
SELECT 'Serviços por Produtivo (ROF042)', 'ROF042_PRODUTIVO', '/Banco de Dados - DAF - Pós-Vendas/Vendas Mecânicos',
  'ROF042_FaturamentoServicosProdutivos_Excel', false, 1,
  'Empresa', 'NF Data', 'Produtivo', 'nome_funcionario', 'Tipo O.S.', true
WHERE NOT EXISTS (SELECT 1 FROM dim_fontes_calculo WHERE codigo = 'ROF042_PRODUTIVO');

INSERT INTO dim_medidas_bi (nome, codigo, fonte_bi_id, coluna_valor, tipo_agregacao, slot_faturamento, ativo)
SELECT v.nome, v.codigo, f.id, v.coluna, v.agregacao, v.slot, true
FROM dim_fontes_calculo f
CROSS JOIN (VALUES
  ('Produtivo - Serviços', 'PROD_SERVICOS', 'Vl Líquido', 'SOMA', 'prodServicos'),
  ('Produtivo - Peças', 'PROD_PECAS', 'Vl Produto', 'SOMA', 'prodPecas'),
  ('Produtivo - Margem Serviços', 'PROD_MARGEM_SERVICOS', 'Vl. Diferença', 'SOMA', 'prodMargemServicos'),
  ('Produtivo - Passagens', 'PROD_PASSAGENS', 'O.S.', 'CONTAGEM_DISTINTA', 'prodPass')
) AS v(nome, codigo, coluna, agregacao, slot)
WHERE f.codigo = 'ROF042_PRODUTIVO'
  AND NOT EXISTS (SELECT 1 FROM dim_medidas_bi m WHERE m.codigo = v.codigo);
