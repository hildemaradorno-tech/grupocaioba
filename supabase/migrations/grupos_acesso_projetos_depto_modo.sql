-- Mesmo padrão de grupos_acesso.auditoria_depto_modo, agora pra Gestão de Projetos:
-- trava de modo (TODOS/INDIVIDUAL) do "Acesso por Departamento — Gestão de Projetos".
-- Default 'TODOS' = sem restrição, preservando o comportamento atual (lista vazia em
-- permissoes_depto_grupo já significava "vê tudo") pros grupos já configurados.
ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS projetos_depto_modo text NOT NULL DEFAULT 'TODOS' CHECK (projetos_depto_modo IN ('TODOS','INDIVIDUAL'));
