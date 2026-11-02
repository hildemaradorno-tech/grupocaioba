-- Regras PJ do tipo "Variáveis": agrupa comissões (grupo_politica_id, ex: PREST001, PREST002) numa linha
-- só no Processamento de Comissões (valor total + Visualizar com a composição). Não calcula nada
-- sozinha e não aparece nas telas de Comissões - DAF/HONDA/GRUPO.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_variaveis boolean NOT NULL DEFAULT false;
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_politica_ids jsonb;

NOTIFY pgrst, 'reload schema';
