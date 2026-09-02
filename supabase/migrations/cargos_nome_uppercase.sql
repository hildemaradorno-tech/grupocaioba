-- Padroniza Nome do Cargo em maiúsculas — a tela de Cargos passou a gravar sempre em
-- maiúsculas (era Title Case antes); aqui corrige os registros já existentes, tanto na
-- tabela de origem (dim_cargos) quanto na cópia denormalizada em dim_funcionarios.cargo_nome.
UPDATE dim_cargos
SET nome_cargo = UPPER(nome_cargo)
WHERE nome_cargo <> UPPER(nome_cargo);

UPDATE dim_funcionarios
SET cargo_nome = UPPER(cargo_nome)
WHERE cargo_nome <> UPPER(cargo_nome);
