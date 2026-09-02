-- "Dias Sobreaviso" passa a ser calculado automaticamente por Data Início/Data Fim (dias
-- corridos), em vez de digitado manualmente — guarda o período pra permitir esse cálculo e
-- exibição na tela.
ALTER TABLE rh_sobreaviso_plantao ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE rh_sobreaviso_plantao ADD COLUMN IF NOT EXISTS data_fim date;
