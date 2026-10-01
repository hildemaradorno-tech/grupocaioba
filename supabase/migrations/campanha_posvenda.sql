-- ============================================================
-- Campanha Pós-Venda (BI — Campanha Pós-Venda, /bi/campanha)
--   fato_campanha_diario      realizado por dia × empresa × pessoa (gravado pelo sync do backend)
--   fato_campanha_metas       metas mensais por unidade (digitadas na aba Regras)
--   fato_campanha_lancamentos dados digitados na Apuração (realizado manual, ocorrências, férias…)
--   fato_campanha_fechamento  resultado congelado de uma semana/mês já pago
-- ============================================================

CREATE TABLE IF NOT EXISTS fato_campanha_diario (
  data              date        NOT NULL,
  ano               smallint    NOT NULL,
  mes               smallint    NOT NULL,
  empresa           text        NOT NULL,   -- nome canônico do extrator: 'CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL'
  tipo              text        NOT NULL CHECK (tipo IN ('consultor', 'mecanico')),
  pessoa_nome       text        NOT NULL,   -- nome no ERP, maiúsculo e sem acento
  pessoa_codigo     text,                   -- Usuario_Codigo do ERP (consultor)
  serv_valor        numeric(14,2) NOT NULL DEFAULT 0,
  pecas_valor       numeric(14,2) NOT NULL DEFAULT 0,
  pecas_margem      numeric(14,2) NOT NULL DEFAULT 0,
  os_codigos        integer[]   NOT NULL DEFAULT '{}',  -- OS distintas do dia (ticket médio = fat ÷ OS distintas do período)
  horas_aplicadas   numeric(10,2) NOT NULL DEFAULT 0,
  horas_vendidas    numeric(10,2) NOT NULL DEFAULT 0,
  horas_disponiveis numeric(10,2) NOT NULL DEFAULT 0,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (data, empresa, tipo, pessoa_nome)
);
CREATE INDEX IF NOT EXISTS idx_campanha_diario_periodo ON fato_campanha_diario (ano, mes, empresa);

CREATE TABLE IF NOT EXISTS fato_campanha_metas (
  ano           smallint NOT NULL,
  mes           smallint NOT NULL,
  unidade       text     NOT NULL,   -- id da unidade na campanha: CG, DOU, TL, CS
  dados         jsonb    NOT NULL DEFAULT '{}'::jsonb,  -- { serv, pecas, ticket, mb, prod, ggServ, ggPecas }
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  PRIMARY KEY (ano, mes, unidade)
);

CREATE TABLE IF NOT EXISTS fato_campanha_lancamentos (
  ano           smallint NOT NULL,
  mes           smallint NOT NULL,
  unidade       text     NOT NULL,
  chave         text     NOT NULL,   -- id do participante, 'func-<uuid>' ou 'U:<unidade>' (dados da unidade)
  periodo       text     NOT NULL,   -- S1..Sn ou MES
  dados         jsonb    NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  PRIMARY KEY (ano, mes, unidade, chave, periodo)
);

CREATE TABLE IF NOT EXISTS fato_campanha_fechamento (
  ano         smallint NOT NULL,
  mes         smallint NOT NULL,
  unidade     text     NOT NULL,
  periodo     text     NOT NULL,     -- S1..Sn ou MES
  dados       jsonb    NOT NULL,     -- snapshot do resultado apurado
  fechado_em  timestamptz NOT NULL DEFAULT now(),
  fechado_por text,
  PRIMARY KEY (ano, mes, unidade, periodo)
);

-- ============================================================
-- RLS — mesmo padrão das tabelas de sincronização da Matriz KPIs
-- (o backend grava fato_campanha_diario com a service key, que ignora RLS)
-- ============================================================
ALTER TABLE fato_campanha_diario      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_campanha_metas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_campanha_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_campanha_fechamento  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON fato_campanha_diario;
DROP POLICY IF EXISTS "auth_all" ON fato_campanha_metas;
DROP POLICY IF EXISTS "auth_all" ON fato_campanha_lancamentos;
DROP POLICY IF EXISTS "auth_all" ON fato_campanha_fechamento;

CREATE POLICY "auth_all" ON fato_campanha_diario      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON fato_campanha_metas       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON fato_campanha_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON fato_campanha_fechamento  FOR ALL TO authenticated USING (true) WITH CHECK (true);
