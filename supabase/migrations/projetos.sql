-- ============================================================
-- MÓDULO: Gestão de Projetos (Lista + Gantt + Kanban)
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Cadastros de apoio
CREATE TABLE IF NOT EXISTS proj_empresas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_departamentos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_areas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_status (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_sistemas (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_responsaveis (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proj_fases (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- 2. Projetos
CREATE TABLE IF NOT EXISTS proj_projetos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              text,
  nome                text NOT NULL,
  descricao           text,
  empresa_id          uuid REFERENCES dim_empresas(id) ON DELETE SET NULL,
  empresa_nome        text,
  departamento_id     uuid REFERENCES proj_departamentos(id) ON DELETE SET NULL,
  departamento_nome   text,
  sistema_id          uuid REFERENCES proj_sistemas(id) ON DELETE SET NULL,
  sistema_nome        text,
  fase_id             uuid REFERENCES proj_fases(id) ON DELETE SET NULL,
  fase_nome           text,
  responsavel_id      uuid REFERENCES proj_responsaveis(id) ON DELETE SET NULL,
  responsavel_nome    text,
  data_inicio         date,
  data_fim_prevista   date,
  data_fim_real       date,
  status              text NOT NULL DEFAULT 'planejado',
  prioridade          text NOT NULL DEFAULT 'media',
  cor                 text DEFAULT '#2563eb',
  ativo               boolean NOT NULL DEFAULT true,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  criado_por          text,
  atualizado_em       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proj_projetos_status_check CHECK (status IN ('planejado','em_andamento','concluido','pausado','cancelado')),
  CONSTRAINT proj_projetos_prioridade_check CHECK (prioridade IN ('baixa','media','alta'))
);

-- 3. Tarefas do projeto
CREATE TABLE IF NOT EXISTS proj_tarefas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id       uuid NOT NULL REFERENCES proj_projetos(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  descricao        text,
  sistema_id       uuid REFERENCES proj_sistemas(id) ON DELETE SET NULL,
  sistema_nome     text,
  fase_id          uuid REFERENCES proj_fases(id) ON DELETE SET NULL,
  fase_nome        text,
  responsavel_id   uuid REFERENCES proj_responsaveis(id) ON DELETE SET NULL,
  responsavel_nome text,
  area_nome        text,
  tipo_item        text,
  caminho          text,
  data_inicio      date,
  data_fim         date,
  progresso_pct    numeric(5,2) NOT NULL DEFAULT 0,
  status_kanban    text NOT NULL DEFAULT 'mapeado',
  prioridade       text NOT NULL DEFAULT 'media',
  ordem            integer NOT NULL DEFAULT 0,
  cor              text DEFAULT '#2563eb',
  ativo            boolean NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proj_tarefas_status_kanban_check CHECK (status_kanban IN ('mapeado','programado','em_andamento','pausado','concluido')),
  CONSTRAINT proj_tarefas_prioridade_check CHECK (prioridade IN ('baixa','media','alta')),
  CONSTRAINT proj_tarefas_progresso_check CHECK (progresso_pct >= 0 AND progresso_pct <= 100)
);

CREATE INDEX IF NOT EXISTS proj_tarefas_projeto_idx ON proj_tarefas (projeto_id);

-- 4. Dependências entre tarefas (predecessora -> sucessora)
CREATE TABLE IF NOT EXISTS proj_tarefas_dependencias (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id           uuid NOT NULL REFERENCES proj_tarefas(id) ON DELETE CASCADE,
  depende_de_tarefa_id uuid NOT NULL REFERENCES proj_tarefas(id) ON DELETE CASCADE,
  criado_em           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proj_dependencias_nao_propria CHECK (tarefa_id <> depende_de_tarefa_id),
  CONSTRAINT proj_dependencias_unica UNIQUE (tarefa_id, depende_de_tarefa_id)
);

CREATE INDEX IF NOT EXISTS proj_dependencias_tarefa_idx ON proj_tarefas_dependencias (tarefa_id);
CREATE INDEX IF NOT EXISTS proj_dependencias_predecessora_idx ON proj_tarefas_dependencias (depende_de_tarefa_id);

-- ============================================================
-- RLS: habilitar Row Level Security (ajuste conforme sua política)
-- ============================================================
ALTER TABLE proj_empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_departamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_areas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_status                ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_sistemas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_responsaveis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_fases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_projetos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_tarefas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_tarefas_dependencias  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON proj_empresas;
DROP POLICY IF EXISTS "auth_all" ON proj_departamentos;
DROP POLICY IF EXISTS "auth_all" ON proj_areas;
DROP POLICY IF EXISTS "auth_all" ON proj_status;
DROP POLICY IF EXISTS "auth_all" ON proj_sistemas;
DROP POLICY IF EXISTS "auth_all" ON proj_responsaveis;
DROP POLICY IF EXISTS "auth_all" ON proj_fases;
DROP POLICY IF EXISTS "auth_all" ON proj_projetos;
DROP POLICY IF EXISTS "auth_all" ON proj_tarefas;
DROP POLICY IF EXISTS "auth_all" ON proj_tarefas_dependencias;

CREATE POLICY "auth_all" ON proj_empresas             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_departamentos        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_areas                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_status               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_sistemas             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_responsaveis         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_fases                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_projetos             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_tarefas              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_tarefas_dependencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: cadastros padrão da Gestão de Projetos
-- ============================================================
INSERT INTO proj_empresas (nome) VALUES
  ('Caiobá Motos'),
  ('Caiobá Trucks'),
  ('Caiobá Serviços'),
  ('Caiobá Participações'),
  ('Caiobá Transportes'),
  ('Caiobá Implementos'),
  ('Caiobá Locações'),
  ('Grupo Caiobá'),
  ('Caiobá Investimentos')
ON CONFLICT DO NOTHING;

INSERT INTO proj_departamentos (nome) VALUES
  ('Contabilidade'),
  ('Financeiro'),
  ('Holding'),
  ('Peças'),
  ('Pós-Vendas'),
  ('RH'),
  ('Serviços'),
  ('Tecnologia'),
  ('Vendas')
ON CONFLICT DO NOTHING;

INSERT INTO proj_status (nome) VALUES
  ('Mapeado'),
  ('Programado'),
  ('Em Andamento'),
  ('Pausado'),
  ('Concluído')
ON CONFLICT DO NOTHING;

INSERT INTO proj_fases (nome) VALUES
  ('Estudo de Viabilidade'),
  ('Elaboração'),
  ('Elaboração Fluxograma'),
  ('Orçamento'),
  ('Contratação'),
  ('Desenvolvimento'),
  ('Aguardando Desenvolvimento'),
  ('Configuração'),
  ('Implantação'),
  ('Validação'),
  ('Aguardando Validação'),
  ('Entrega'),
  ('Comunicação'),
  ('Cancelado'),
  ('Publicação')
ON CONFLICT DO NOTHING;

INSERT INTO proj_areas (nome) VALUES
  ('BI'),
  ('Cobrança'),
  ('Compras'),
  ('Contas a Pagar'),
  ('Contas a Receber'),
  ('Controladoria'),
  ('Crédito'),
  ('Diretoria'),
  ('Fiscal'),
  ('Garantias'),
  ('Geral'),
  ('Novos'),
  ('Peças'),
  ('Pós-Vendas'),
  ('Projetos'),
  ('Relacionamentos'),
  ('RH'),
  ('Seminovos'),
  ('Serviços'),
  ('Tesouraria'),
  ('Vendas')
ON CONFLICT DO NOTHING;
