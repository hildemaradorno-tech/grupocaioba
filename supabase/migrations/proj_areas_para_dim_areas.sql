-- Gestão de Projetos passa a usar o cadastro de Áreas da organização (dim_areas — Configurações →
-- Tabelas da Organização → Áreas) em vez do cadastro próprio proj_areas.
-- Projetos e tarefas gravam o NOME da área (proj_projetos.area_nome / proj_tarefas.area_nome), então basta
-- garantir que todo nome em uso exista em dim_areas. Só entram as áreas que estão de fato em uso;
-- proj_areas fica intacta (sem uso no código), para consulta.
INSERT INTO dim_areas (nome_area, ativo)
SELECT DISTINCT u.area_nome, true
FROM (
  SELECT trim(area_nome) AS area_nome FROM proj_projetos WHERE coalesce(trim(area_nome), '') <> ''
  UNION
  SELECT trim(area_nome) FROM proj_tarefas WHERE coalesce(trim(area_nome), '') <> ''
) u
WHERE NOT EXISTS (SELECT 1 FROM dim_areas d WHERE lower(trim(d.nome_area)) = lower(u.area_nome));

-- Conferência: nomes em uso que continuam fora de dim_areas (deve voltar vazio)
SELECT DISTINCT area_nome AS faltando FROM (
  SELECT area_nome FROM proj_projetos UNION SELECT area_nome FROM proj_tarefas
) x
WHERE coalesce(trim(area_nome), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM dim_areas d WHERE lower(trim(d.nome_area)) = lower(trim(x.area_nome)));
