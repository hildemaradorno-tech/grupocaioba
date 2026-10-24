-- Regra de Sobreaviso/Plantão com valor semanal: a cada 7 dias de sobreaviso no lançamento paga o
-- valor da semana completa; os dias que sobram pagam o valor diário. Valor semanal 0 = só diário.
ALTER TABLE config_sobreaviso ADD COLUMN IF NOT EXISTS valor_semana_sobreaviso numeric(12,2) NOT NULL DEFAULT 0;
-- Valor de referência atual (R$ 240,00 por semana completa de 7 dias).
UPDATE config_sobreaviso SET valor_semana_sobreaviso = 240.00 WHERE valor_semana_sobreaviso = 0;

-- Retrato do valor semanal usado em cada lançamento (como valor_dia_sobreaviso/valor_deslocamento).
ALTER TABLE rh_sobreaviso_plantao ADD COLUMN IF NOT EXISTS valor_semana_sobreaviso numeric(12,2);

NOTIFY pgrst, 'reload schema';
