-- Quais empresas cada Rubrica atende — cadastro só informativo (não altera o TXT de pagamento
-- nem fato_politica_comissao, que continua guardando o código como texto de sempre).
ALTER TABLE dim_rubricas ADD COLUMN IF NOT EXISTS empresa_ids uuid[] NOT NULL DEFAULT '{}';
