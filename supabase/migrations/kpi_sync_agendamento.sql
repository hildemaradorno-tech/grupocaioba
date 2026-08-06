-- ============================================================
-- MÓDULO: Sincronização de Dados — KPI Dashboard / Matriz KPIs
-- Executar no Supabase SQL Editor
-- ============================================================

-- Configuração única (liga/desliga o agendamento automático sem apagar horários)
CREATE TABLE IF NOT EXISTS kpi_sync_config (
  id     smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ativo  boolean NOT NULL DEFAULT true
);
INSERT INTO kpi_sync_config (id, ativo) VALUES (1, true) ON CONFLICT (id) DO NOTHING;

-- Horários recorrentes por dia da semana (1=Segunda ... 7=Domingo).
-- "Todos os dias" = uma linha por dia (7 linhas); múltiplos horários no
-- mesmo dia = múltiplas linhas com o mesmo dia_semana.
CREATE TABLE IF NOT EXISTS kpi_sync_horarios_semana (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana  smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora        time NOT NULL,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_sync_horarios_semana_dia_idx ON kpi_sync_horarios_semana (dia_semana);

-- Datas avulsas (exceções/rodadas extras fora do cronograma semanal)
CREATE TABLE IF NOT EXISTS kpi_sync_datas_especificas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data      date NOT NULL,
  hora      time NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_sync_datas_especificas_data_idx ON kpi_sync_datas_especificas (data);

-- Histórico/auditoria de execuções (alimenta o badge "última sincronização")
CREATE TABLE IF NOT EXISTS kpi_sync_execucoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em   timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status        text NOT NULL DEFAULT 'EXECUTANDO' CHECK (status IN ('EXECUTANDO', 'SUCESSO', 'ERRO', 'PARCIAL')),
  disparado_por text NOT NULL CHECK (disparado_por IN ('AGENDADO', 'MANUAL')),
  usuario_email text,
  detalhes      jsonb
);

CREATE INDEX IF NOT EXISTS kpi_sync_execucoes_iniciado_idx ON kpi_sync_execucoes (iniciado_em DESC);

-- Cache das planilhas pequenas de metas/config (RESULTADOS, BLOCO 1, BLOCO 2, BACKLOG)
CREATE TABLE IF NOT EXISTS kpi_cache_planilhas (
  chave         text PRIMARY KEY,
  dados         jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Cache dos resultados já agregados do Extractor (por fonte/ano/empresa —
-- não linha a linha; "todas" é usada para o painel consolidado de Gerente Geral)
CREATE TABLE IF NOT EXISTS kpi_cache_extrator (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte         text NOT NULL,
  ano           integer NOT NULL,
  empresa       text NOT NULL DEFAULT 'todas',
  dados         jsonb NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fonte, ano, empresa)
);

-- ============================================================
-- RLS: habilitar Row Level Security
-- ============================================================
ALTER TABLE kpi_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_sync_horarios_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_sync_datas_especificas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_sync_execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_cache_planilhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_cache_extrator ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON kpi_sync_config;
DROP POLICY IF EXISTS "auth_all" ON kpi_sync_horarios_semana;
DROP POLICY IF EXISTS "auth_all" ON kpi_sync_datas_especificas;
DROP POLICY IF EXISTS "auth_all" ON kpi_sync_execucoes;
DROP POLICY IF EXISTS "auth_all" ON kpi_cache_planilhas;
DROP POLICY IF EXISTS "auth_all" ON kpi_cache_extrator;

CREATE POLICY "auth_all" ON kpi_sync_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON kpi_sync_horarios_semana FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON kpi_sync_datas_especificas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON kpi_sync_execucoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON kpi_cache_planilhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON kpi_cache_extrator FOR ALL TO authenticated USING (true) WITH CHECK (true);
