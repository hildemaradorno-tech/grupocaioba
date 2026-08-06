-- Código da rubrica no sistema de folha (RM/TOTVS) que essa Política de Comissão representa —
-- usado só na hora de gerar o TXT de importação de lançamentos em Histórico de Comissões
-- (botão Processar p/ Pagamento). Sem valor aqui, o lançamento daquela política fica de fora
-- do TXT gerado (não dá pra inventar um código).
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS codigo_rubrica text;
