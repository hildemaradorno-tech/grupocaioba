CREATE TABLE IF NOT EXISTS proj_atas_reuniao (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data             DATE        NOT NULL,
  horario_inicio   TEXT,
  horario_fim      TEXT,
  local            TEXT,
  proxima_reuniao  DATE,
  responsavel_ata_nome TEXT,
  participantes_nomes  TEXT[]  DEFAULT '{}',
  periodo_ini      DATE,
  periodo_fim      DATE,
  dados            JSONB       NOT NULL DEFAULT '{}',
  criado_por       TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
