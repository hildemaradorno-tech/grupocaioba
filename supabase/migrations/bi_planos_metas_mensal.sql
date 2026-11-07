-- BI Planos de Manutenção: metas passam a ser por mês e ano (uma linha por indicador + ano + mês).
-- As metas que já existiam (sem mês) viram as de novembro/2026, quando foram cadastradas.
-- Na tela, um mês sem meta usa a última meta cadastrada antes dele (ou a padrão, se não houver nenhuma).
ALTER TABLE bi_planos_metas ADD COLUMN IF NOT EXISTS ano smallint;
ALTER TABLE bi_planos_metas ADD COLUMN IF NOT EXISTS mes smallint;
UPDATE bi_planos_metas SET ano = 2026, mes = 11 WHERE ano IS NULL OR mes IS NULL;
ALTER TABLE bi_planos_metas ALTER COLUMN ano SET NOT NULL;
ALTER TABLE bi_planos_metas ALTER COLUMN mes SET NOT NULL;
ALTER TABLE bi_planos_metas DROP CONSTRAINT IF EXISTS bi_planos_metas_mes_check;
ALTER TABLE bi_planos_metas ADD CONSTRAINT bi_planos_metas_mes_check CHECK (mes BETWEEN 1 AND 12);
ALTER TABLE bi_planos_metas DROP CONSTRAINT IF EXISTS bi_planos_metas_pkey;
ALTER TABLE bi_planos_metas ADD CONSTRAINT bi_planos_metas_pkey PRIMARY KEY (indicador, ano, mes);

NOTIFY pgrst, 'reload schema';
