-- Trava de modo (TODOS/INDIVIDUAL) do "Acesso por Departamento — Auditoria Externa",
-- no mesmo padrão de grupos_acesso.comissao_escopo_habilitado (Cálculo de Comissões).
-- Default 'TODOS' = sem restrição, preservando o comportamento atual (lista vazia em
-- permissoes_depto_grupo_auditoria já significava "vê tudo") pros grupos já configurados.
ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS auditoria_depto_modo text NOT NULL DEFAULT 'TODOS' CHECK (auditoria_depto_modo IN ('TODOS','INDIVIDUAL'));
