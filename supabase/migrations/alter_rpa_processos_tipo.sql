-- ============================================================
-- Move o Tipo (RPA/PBI) para o cadastro de processos/relatórios:
-- cada processo tem um único tipo, definido no cadastro, e as
-- demais telas (rotinas/execuções) assumem esse valor.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'RPA' CHECK (tipo IN ('RPA', 'PBI'));

-- Backfill: assume o tipo mais usado nas execuções já cadastradas de cada processo
UPDATE rpa_processos p
SET tipo = sub.tipo
FROM (
  SELECT r.processo_id, e.tipo,
         ROW_NUMBER() OVER (PARTITION BY r.processo_id ORDER BY COUNT(*) DESC) AS rn
  FROM rpa_rotinas r
  JOIN rpa_rotina_execucoes e ON e.rotina_id = r.id
  WHERE e.tipo IS NOT NULL AND r.processo_id IS NOT NULL
  GROUP BY r.processo_id, e.tipo
) sub
WHERE sub.processo_id = p.id AND sub.rn = 1;

-- Alinha as execuções existentes ao tipo do processo. A coluna tipo em
-- rpa_rotina_execucoes continua existindo (as grades leem dela), mas passa
-- a ser sempre uma cópia do tipo do cadastro, preenchida pelo sistema.
UPDATE rpa_rotina_execucoes e
SET tipo = p.tipo
FROM rpa_rotinas r
JOIN rpa_processos p ON p.id = r.processo_id
WHERE e.rotina_id = r.id AND e.tipo IS DISTINCT FROM p.tipo;
