-- Resultado dado pelo responsável ao responder uma manifestação.
-- Valores possíveis: 'Aprovado', 'Aprovado com Ressalvas', 'Recusado', 'Respondido'
ALTER TABLE proj_manifestacoes ADD COLUMN IF NOT EXISTS resultado_manifestacao text;
