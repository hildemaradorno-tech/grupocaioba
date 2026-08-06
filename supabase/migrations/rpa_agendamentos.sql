-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Executar no Supabase SQL Editor
-- ============================================================

-- Cadastro de apoio: Processos/Relatórios (selecionável no formulário da rotina).
-- Cada processo já carrega seu setor responsável (dim_departamentos) e seu
-- tipo (RPA ou PBI) — ao selecionar o processo na rotina, setor e tipo são
-- preenchidos automaticamente.
CREATE TABLE IF NOT EXISTS rpa_processos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               text NOT NULL UNIQUE,
  departamento_id    uuid REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  departamento_nome  text,
  tipo               text NOT NULL DEFAULT 'RPA' CHECK (tipo IN ('RPA', 'PBI', 'FAB')),
  -- só para tipo PBI: qual processo RPA alimenta este relatório
  -- (a aba "Atualização" esconde o RPA vinculado e mostra só o PBI)
  rpa_vinculado_id   uuid REFERENCES rpa_processos(id) ON DELETE SET NULL,
  rpa_vinculado_nome text,
  -- tempo médio de atualização em minutos (aba Atualização: hora agendada + este tempo)
  tempo_atualizacao_min integer NOT NULL DEFAULT 15 CHECK (tempo_atualizacao_min >= 0),
  ativo              boolean NOT NULL DEFAULT true,
  criado_em          timestamptz NOT NULL DEFAULT now()
);

-- Tabela principal: uma "rotina" = cadastro vinculado a um setor responsável
-- (dim_departamentos existente) e a um único processo/relatório (rpa_processos),
-- que vale para todos os dias/horários em que a rotina roda.
CREATE TABLE IF NOT EXISTS rpa_rotinas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id       uuid REFERENCES rpa_processos(id) ON DELETE SET NULL,
  processo          text,
  departamento_id   uuid REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  departamento_nome text,
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpa_rotinas_departamento_idx ON rpa_rotinas (departamento_id);
CREATE INDEX IF NOT EXISTS rpa_rotinas_processo_idx ON rpa_rotinas (processo_id);

-- Execuções agendadas por dia da semana de uma rotina, com horário próprio.
-- Um dia pode ter mais de uma execução. O tipo é sempre cópia do tipo do
-- processo (rpa_processos.tipo), preenchido pelo sistema ao salvar.
-- dia_semana: 1=Segunda ... 7=Domingo.
CREATE TABLE IF NOT EXISTS rpa_rotina_execucoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotina_id   uuid NOT NULL REFERENCES rpa_rotinas(id) ON DELETE CASCADE,
  dia_semana  smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora        time,
  tipo        text CHECK (tipo IS NULL OR tipo IN ('RPA', 'PBI', 'FAB')),
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rpa_rotina_execucoes_rotina_idx ON rpa_rotina_execucoes (rotina_id);
CREATE INDEX IF NOT EXISTS rpa_rotina_execucoes_dia_idx ON rpa_rotina_execucoes (dia_semana);

-- ============================================================
-- RLS: habilitar Row Level Security (ajuste conforme sua política)
-- ============================================================
ALTER TABLE rpa_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpa_rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpa_rotina_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON rpa_processos;
DROP POLICY IF EXISTS "auth_all" ON rpa_rotinas;
DROP POLICY IF EXISTS "auth_all" ON rpa_rotina_execucoes;

CREATE POLICY "auth_all" ON rpa_processos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rpa_rotinas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rpa_rotina_execucoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
