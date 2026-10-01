-- ============================================================
-- Unifica proj_departamentos (cadastro simples usado em Gestão de Projetos e
-- Auditoria Externa) com dim_departamentos (dimensão de RH/BI, usada em
-- Comissões, Garantias DAF, Funcionários etc.) — a partir de agora só existe
-- um cadastro de Departamentos (dim_departamentos), em Configurações.
--
-- Levantamento prévio mostrou que os dois cadastros têm nomes DIFERENTES na
-- maioria dos casos (dim_departamentos é organizado por área física da loja:
-- OFICINA, BALCÃO PEÇAS...; proj_departamentos por área corporativa:
-- Financeiro, RH, Tecnologia...). De 14 nomes em proj_departamentos, só 3
-- já existiam em dim_departamentos (Holding, Geral, Relacionamentos — com
-- grafia diferente). Os outros 11 são inseridos como novos departamentos.
-- Executar no Supabase SQL Editor.
-- ============================================================

BEGIN;

-- 1) Insere em dim_departamentos os nomes que só existiam em proj_departamentos
--    (case-insensitive — evita duplicar Holding/Geral/Relacionamentos, que já
--    existem lá com grafia em caixa alta).
INSERT INTO dim_departamentos (nome_departamento)
SELECT pd.nome
FROM proj_departamentos pd
WHERE NOT EXISTS (
  SELECT 1 FROM dim_departamentos dd WHERE dd.nome_departamento ILIKE pd.nome
);

-- 2) Solta a FK de audext_planos_acao antes de repontar os dados (senão o
--    UPDATE abaixo esbarra na constraint antiga, que ainda aponta pra
--    proj_departamentos).
ALTER TABLE audext_planos_acao DROP CONSTRAINT audext_planos_acao_departamento_id_fkey;

-- 3) Reponta proj_projetos (departamento_id + a coluna denormalizada
--    departamento_nome) pro id/nome definitivo em dim_departamentos.
UPDATE proj_projetos pp
SET departamento_id = dd.id,
    departamento_nome = dd.nome_departamento
FROM proj_departamentos pd
JOIN dim_departamentos dd ON dd.nome_departamento ILIKE pd.nome
WHERE pp.departamento_id = pd.id;

-- 4) Repointa audext_planos_acao.departamento_id (Auditoria Externa).
UPDATE audext_planos_acao apa
SET departamento_id = dd.id
FROM proj_departamentos pd
JOIN dim_departamentos dd ON dd.nome_departamento ILIKE pd.nome
WHERE apa.departamento_id = pd.id;

-- 5) Recria a FK de audext_planos_acao agora apontando pra dim_departamentos
--    (era a única FK de fato existente no banco apontando pra proj_departamentos).
ALTER TABLE audext_planos_acao
  ADD CONSTRAINT audext_planos_acao_departamento_id_fkey
  FOREIGN KEY (departamento_id) REFERENCES dim_departamentos(id) ON DELETE SET NULL;

-- 6) Normaliza o nome gravado nas permissões de Grupo de Acesso por
--    Departamento (guardam o NOME em texto, não o id) — só afeta
--    Holding/Geral/Relacionamentos, cuja grafia mudou.
UPDATE permissoes_depto_grupo g
SET departamento_nome = dd.nome_departamento
FROM proj_departamentos pd
JOIN dim_departamentos dd ON dd.nome_departamento ILIKE pd.nome
WHERE g.departamento_nome = pd.nome AND g.departamento_nome <> dd.nome_departamento;

UPDATE permissoes_depto_grupo_auditoria g
SET departamento_nome = dd.nome_departamento
FROM proj_departamentos pd
JOIN dim_departamentos dd ON dd.nome_departamento ILIKE pd.nome
WHERE g.departamento_nome = pd.nome AND g.departamento_nome <> dd.nome_departamento;

-- 7) Remove o cadastro antigo — a partir de agora só existe dim_departamentos.
DROP TABLE proj_departamentos;

COMMIT;
