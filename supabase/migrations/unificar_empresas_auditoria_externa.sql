-- ============================================================
-- Unifica a Empresa do Ciclo de Auditoria (Auditoria Externa) com o cadastro
-- único de Empresas (dim_empresas, gerenciado em Configurações) — antes
-- audext_ciclos.empresa_id referenciava proj_empresas (cadastro simples de
-- Gestão de Projetos, por grupo/marca, sem separar por filial).
--
-- Levantamento prévio: os dois cadastros têm granularidade diferente
-- (dim_empresas é por filial física — ex: "CAIOBÁ TRUCKS - CAMPO GRANDE";
-- proj_empresas é por marca — ex: "Caiobá Trucks"). Hoje os 2 ciclos
-- cadastrados usam "Grupo Caiobá", que o usuário já cadastrou em
-- dim_empresas antes desta migration rodar — por isso o UPDATE abaixo
-- encontra par pra eles. Os outros nomes de proj_empresas sem correspondência
-- em dim_empresas não têm nenhum ciclo/permissão vinculado hoje (conferido
-- antes de aplicar), então não há dado a perder.
-- Executar no Supabase SQL Editor.
-- ============================================================

BEGIN;

-- 1) Solta as FKs antes de repontar os dados.
ALTER TABLE audext_ciclos DROP CONSTRAINT audext_ciclos_empresa_id_fkey;
ALTER TABLE permissoes_empresa_grupo_auditoria DROP CONSTRAINT permissoes_empresa_grupo_auditoria_empresa_id_fkey;

-- 2) Reponta audext_ciclos.empresa_id pro id correspondente em dim_empresas
--    (por nome, case-insensitive).
UPDATE audext_ciclos ac
SET empresa_id = de.id
FROM proj_empresas pe
JOIN dim_empresas de ON de.empresa_fantasia ILIKE pe.nome OR de.nome_empresa ILIKE pe.nome
WHERE ac.empresa_id = pe.id;

-- 3) Reponta permissoes_empresa_grupo_auditoria.empresa_id da mesma forma
--    (hoje sem nenhuma linha configurada, mas por segurança/futuro).
UPDATE permissoes_empresa_grupo_auditoria peg
SET empresa_id = de.id
FROM proj_empresas pe
JOIN dim_empresas de ON de.empresa_fantasia ILIKE pe.nome OR de.nome_empresa ILIKE pe.nome
WHERE peg.empresa_id = pe.id;

-- 4) Qualquer ciclo/permissão que não tenha achado par agora fica com
--    empresa_id nulo em vez de apontar pra um id que não vai mais existir
--    como FK válida — evita erro ao recriar a constraint abaixo.
UPDATE audext_ciclos ac
SET empresa_id = NULL
WHERE ac.empresa_id IS NOT NULL AND ac.empresa_id NOT IN (SELECT id FROM dim_empresas);

DELETE FROM permissoes_empresa_grupo_auditoria peg
WHERE peg.empresa_id IS NOT NULL AND peg.empresa_id NOT IN (SELECT id FROM dim_empresas);

-- 5) Recria as FKs agora apontando pra dim_empresas.
ALTER TABLE audext_ciclos
  ADD CONSTRAINT audext_ciclos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES dim_empresas(id) ON DELETE SET NULL;

ALTER TABLE permissoes_empresa_grupo_auditoria
  ADD CONSTRAINT permissoes_empresa_grupo_auditoria_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES dim_empresas(id) ON DELETE CASCADE;

COMMIT;
