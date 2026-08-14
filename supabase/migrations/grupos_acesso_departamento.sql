-- Campo informativo de Departamento no cadastro de Grupos de Acesso — usado só pra
-- identificar/visualizar na tabela a qual departamento cada grupo pertence, sem
-- nenhum efeito em permissões (não confundir com "Acesso por Departamento (Projetos)",
-- que já existe em permissoes_departamentos_grupo e controla acesso de verdade).
ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS departamento text;
