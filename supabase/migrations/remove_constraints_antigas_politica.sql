-- tipo_evento e base_tipo em fato_politica_comissao viraram referências dinâmicas aos códigos
-- de dim_fontes_calculo/dim_bases_calculo (não mais uma lista fixa hardcoded no código).
-- As CHECK constraints antigas (criadas quando essas colunas ainda eram um enum de texto livre
-- limitado à lista original) bloqueiam qualquer Fonte/Base nova criada depois disso — precisam sair.

ALTER TABLE fato_politica_comissao DROP CONSTRAINT IF EXISTS fato_politica_comissao_base_tipo_check;
ALTER TABLE fato_politica_comissao DROP CONSTRAINT IF EXISTS fato_politica_comissao_tipo_evento_check;
