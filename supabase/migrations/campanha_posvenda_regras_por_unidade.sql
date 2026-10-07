-- ============================================================
-- Campanha Pós-Venda — regras gravadas por EMPRESA + mês + ano
-- unidade: CG, DOU, TL, CS, TRUCKS (Gerente Geral) ou GERAL (linhas antigas, usadas como
-- ponto de partida por quem ainda não salvou regras próprias).
-- Leitura (frontend): última linha da própria unidade com (ano, mês) <= o escolhido; sem nenhuma,
-- a última linha GERAL; sem nenhuma, o padrão do regulamento embutido no sistema.
-- ============================================================
ALTER TABLE fato_campanha_regras ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'GERAL';

ALTER TABLE fato_campanha_regras DROP CONSTRAINT IF EXISTS fato_campanha_regras_pkey;
ALTER TABLE fato_campanha_regras ADD CONSTRAINT fato_campanha_regras_pkey PRIMARY KEY (ano, mes, unidade);
