-- ============================================================
-- MÓDULO: Controle de Garantias DAF
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Consultores Técnicos de Garantia
CREATE TABLE IF NOT EXISTS gar_consultores_tecnicos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  empresa_id  uuid REFERENCES dim_empresas(id) ON DELETE SET NULL,
  empresa_nome text,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 2. Tipos de OS de Garantia (G01, G02, Campanhas, etc.)
CREATE TABLE IF NOT EXISTS gar_tipos_garantia (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo    text NOT NULL UNIQUE,
  descricao text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gar_tipos_garantia (codigo, descricao) VALUES
  ('G01', 'Garantia Normal'),
  ('G02', 'Garantia Contrato'),
  ('G03', 'Campanha'),
  ('G04', 'Revisão Gratuita'),
  ('G05', 'Garantia de Campo')
ON CONFLICT (codigo) DO NOTHING;

-- 3. Motivos de Recusa pela Fábrica
CREATE TABLE IF NOT EXISTS gar_motivos_recusa (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo    text,
  descricao text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gar_motivos_recusa (codigo, descricao) VALUES
  ('MR01', 'Documentação incompleta'),
  ('MR02', 'Prazo de garantia expirado'),
  ('MR03', 'Dano não coberto pela garantia'),
  ('MR04', 'Mau uso pelo operador'),
  ('MR05', 'Peça não identificada na SG'),
  ('MR06', 'Erro no preenchimento da OS'),
  ('MR07', 'SG fora do prazo de envio')
ON CONFLICT DO NOTHING;

-- 4. Tabela principal de Garantias
CREATE TABLE IF NOT EXISTS gar_garantias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Etapa 1: Abertura
  empresa_id        uuid REFERENCES dim_empresas(id) ON DELETE SET NULL,
  empresa_nome      text,
  cliente           text,
  consultor_id      uuid REFERENCES gar_consultores_tecnicos(id) ON DELETE SET NULL,
  consultor_nome    text,
  tipo_garantia_id  uuid REFERENCES gar_tipos_garantia(id) ON DELETE SET NULL,
  tipo_garantia_descricao text,
  numero_os         text NOT NULL,
  chassi            text,
  numero_sg         text,
  data_abertura_os  date,

  -- Etapa 2: Processamento
  data_lancamento       date,
  status_codigo         text NOT NULL DEFAULT 'A',
  sg_reapresentada      text,
  data_reapresentacao   date,

  -- Etapa 3: Faturamento
  numero_nf         text,
  valor_pecas       numeric(15,2) DEFAULT 0,
  valor_servicos    numeric(15,2) DEFAULT 0,
  data_emissao_nf   date,
  data_envio_fabrica date,

  -- Etapa 4: Financeiro
  previsao_pagamento     date,
  aceite_fabrica         text,
  data_ultima_verificacao date,

  -- Etapa 5: Recusa/Glosa
  data_recusa           date,
  motivo_recusa_id      uuid REFERENCES gar_motivos_recusa(id) ON DELETE SET NULL,
  motivo_recusa_descricao text,
  plano_acao            text,

  -- OS Fechada no sistema da concessionária
  fechado       boolean NOT NULL DEFAULT false,

  -- Controle de auditoria
  criado_em     timestamptz NOT NULL DEFAULT now(),
  criado_por    text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,

  CONSTRAINT gar_garantias_status_check CHECK (status_codigo IN ('A','B','C','D','E','F','G'))
);

CREATE UNIQUE INDEX IF NOT EXISTS gar_garantias_numero_os_idx ON gar_garantias (numero_os);

-- 5. Log de alterações de status
CREATE TABLE IF NOT EXISTS gar_garantias_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id  uuid NOT NULL REFERENCES gar_garantias(id) ON DELETE CASCADE,
  campo        text NOT NULL,
  valor_antes  text,
  valor_depois text,
  alterado_por text,
  alterado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gar_log_garantia_idx ON gar_garantias_log (garantia_id, alterado_em DESC);

-- ============================================================
-- RLS: habilitar Row Level Security (ajuste conforme sua política)
-- ============================================================
ALTER TABLE gar_consultores_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gar_tipos_garantia       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gar_motivos_recusa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gar_garantias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE gar_garantias_log        ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para usuários autenticados (ajuste se necessário)
CREATE POLICY "auth_all" ON gar_consultores_tecnicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON gar_tipos_garantia       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON gar_motivos_recusa       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON gar_garantias            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON gar_garantias_log        FOR ALL TO authenticated USING (true) WITH CHECK (true);
