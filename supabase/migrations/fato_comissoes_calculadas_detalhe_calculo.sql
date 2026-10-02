-- Guarda o detalhamento que a calculadora (ícone "Regra da Comissão" / Venda-Devolução) já
-- mostra em Cálculo de Comissões, mas que não sobrevivia ao salvar — sem isso, Processamento de
-- Comissões (Detalhe do Cálculo) não tinha como reconstruir bruto/desconto/meta/%atingido/
-- base da comissão/detalhamento por coluna depois do cálculo já ter sido persistido.
-- Shape: { valorApurado, valorBruto, descontoPct, valorFixo, percentualAtingido, meta,
--          valorPorColuna, segmentos }
ALTER TABLE fato_comissoes_calculadas ADD COLUMN IF NOT EXISTS detalhe_calculo jsonb;
