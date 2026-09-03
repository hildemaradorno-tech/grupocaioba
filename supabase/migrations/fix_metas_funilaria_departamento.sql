-- Funilaria/Pintura é um Setor do departamento Oficina (cadastro em /departamentos e
-- /setores-servico) — corrige os registros de Meta de Funilaria já publicados sem
-- departamento/setor (fato_rascunho_metas_funilaria_pintura não tem essas colunas, então a
-- publicação sempre saiu com elas nulas até agora).
UPDATE fato_metas_publicadas
SET departamento_id = 'd549c5fc-79dd-4346-bfd9-cbef8e902a3f',
    departamento_nome = 'OFICINA',
    setor_id = '1dc0a6ce-ced3-4084-8eb9-14084821adbe',
    setor_nome = 'Funilaria/Pintura'
WHERE tipo = 'funilaria' AND departamento_id IS NULL;
