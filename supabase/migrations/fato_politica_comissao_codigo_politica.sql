-- Código da Política de Comissão (digitado no cadastro, opcional) — identifica a política nas
-- telas do menu Comissões. Fica igual em todas as linhas do mesmo grupo_politica_id (uma por cargo),
-- como descricao_comissao.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS codigo_politica text;

NOTIFY pgrst, 'reload schema';
