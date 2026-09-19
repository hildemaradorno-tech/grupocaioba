-- Segmento do Agrupamento de Empresas passa a ser gravado sempre em MAIÚSCULAS (o frontend
-- já grava assim daqui pra frente) — aqui só converte os registros existentes.
UPDATE dim_agrupamento_empresas
SET segmento_nome = UPPER(segmento_nome)
WHERE segmento_nome IS NOT NULL AND segmento_nome <> UPPER(segmento_nome);
