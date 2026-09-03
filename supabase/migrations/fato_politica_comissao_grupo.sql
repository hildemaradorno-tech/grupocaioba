-- Uma Política de Comissão passa a poder ser aplicada a vários cargos de uma vez (cada cargo
-- já é escopado por empresa — dim_cargos.empresa_id — então o mesmo cargo/código pode existir
-- em CNPJs diferentes). Por baixo continua sendo uma linha por cargo em fato_politica_comissao
-- (nada muda na resolução usada pelo motor de cálculo, que já casa por cargo_id +
-- agrupamento_empresa_id linha a linha) — grupo_politica_id só marca quais linhas nasceram
-- juntas na tela, pra edição/visualização tratarem como "uma comissão só".
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS grupo_politica_id uuid;

-- Política já cadastrada nunca teve essa noção de grupo — cada uma vira um grupo de 1 (o próprio id).
UPDATE fato_politica_comissao SET grupo_politica_id = id WHERE grupo_politica_id IS NULL;

ALTER TABLE fato_politica_comissao ALTER COLUMN grupo_politica_id SET NOT NULL;
ALTER TABLE fato_politica_comissao ALTER COLUMN grupo_politica_id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_fato_politica_comissao_grupo ON fato_politica_comissao(grupo_politica_id);
