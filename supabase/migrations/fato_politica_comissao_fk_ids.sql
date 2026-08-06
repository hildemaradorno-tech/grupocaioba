-- Política de Comissão passa a se vincular à Fonte/Base de Cálculo por ID (chave estrangeira de
-- verdade), não mais por um texto "código" — isso quebrava sempre que a Fonte/Base era editada.

ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS fonte_calculo_id uuid REFERENCES dim_fontes_calculo(id) ON DELETE SET NULL;
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS base_calculo_id uuid REFERENCES dim_bases_calculo(id) ON DELETE SET NULL;

-- Backfill: liga cada política à Fonte/Base atual cujo código bate com o texto salvo hoje.
UPDATE fato_politica_comissao p
SET fonte_calculo_id = f.id
FROM dim_fontes_calculo f
WHERE p.tipo_evento = f.codigo AND p.fonte_calculo_id IS NULL;

UPDATE fato_politica_comissao p
SET base_calculo_id = b.id
FROM dim_bases_calculo b
WHERE p.base_tipo = b.codigo AND p.base_calculo_id IS NULL;

-- Corrige os 3 registros órfãos encontrados no diagnóstico (código antigo "FAT SERVICO", cargos
-- Mecânico Sênior/Júnior/Master) — aponta pra Base "Faturamento Serviços Mecânico".
-- CONFIRME que esse é o ID certo antes de rodar (rode: SELECT id, nome FROM dim_bases_calculo;).
UPDATE fato_politica_comissao
SET base_calculo_id = '80e255ca-8f97-4af5-84f2-495c0d42b3cc'
WHERE base_tipo = 'FAT SERVICO' AND base_calculo_id IS NULL;

-- Remove as colunas antigas de texto — a partir daqui o vínculo é só por ID.
ALTER TABLE fato_politica_comissao DROP COLUMN IF EXISTS tipo_evento;
ALTER TABLE fato_politica_comissao DROP COLUMN IF EXISTS base_tipo;
