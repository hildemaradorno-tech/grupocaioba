-- ============================================================
-- CORREÇÃO: Remove duplicatas e reinsere dados corretos
-- Execute este script UMA VEZ no Supabase SQL Editor
-- ============================================================

-- Limpa todas as tabelas de cadastro (sem dados de projetos/tarefas ainda)
TRUNCATE proj_empresas     RESTART IDENTITY CASCADE;
TRUNCATE proj_departamentos RESTART IDENTITY CASCADE;
TRUNCATE proj_areas        RESTART IDENTITY CASCADE;
TRUNCATE proj_status       RESTART IDENTITY CASCADE;
TRUNCATE proj_sistemas     RESTART IDENTITY CASCADE;
TRUNCATE proj_responsaveis RESTART IDENTITY CASCADE;
TRUNCATE proj_fases        RESTART IDENTITY CASCADE;

-- Adiciona constraint UNIQUE no nome para evitar duplicatas futuras
ALTER TABLE proj_empresas      DROP CONSTRAINT IF EXISTS proj_empresas_nome_key;
ALTER TABLE proj_departamentos DROP CONSTRAINT IF EXISTS proj_departamentos_nome_key;
ALTER TABLE proj_areas         DROP CONSTRAINT IF EXISTS proj_areas_nome_key;
ALTER TABLE proj_status        DROP CONSTRAINT IF EXISTS proj_status_nome_key;
ALTER TABLE proj_sistemas      DROP CONSTRAINT IF EXISTS proj_sistemas_nome_key;
ALTER TABLE proj_responsaveis  DROP CONSTRAINT IF EXISTS proj_responsaveis_nome_key;
ALTER TABLE proj_fases         DROP CONSTRAINT IF EXISTS proj_fases_nome_key;

ALTER TABLE proj_empresas      ADD CONSTRAINT proj_empresas_nome_key      UNIQUE (nome);
ALTER TABLE proj_departamentos ADD CONSTRAINT proj_departamentos_nome_key UNIQUE (nome);
ALTER TABLE proj_areas         ADD CONSTRAINT proj_areas_nome_key         UNIQUE (nome);
ALTER TABLE proj_status        ADD CONSTRAINT proj_status_nome_key        UNIQUE (nome);
ALTER TABLE proj_sistemas      ADD CONSTRAINT proj_sistemas_nome_key      UNIQUE (nome);
ALTER TABLE proj_responsaveis  ADD CONSTRAINT proj_responsaveis_nome_key  UNIQUE (nome);
ALTER TABLE proj_fases         ADD CONSTRAINT proj_fases_nome_key         UNIQUE (nome);

-- Reinsere dados corretos (1 vez cada)
INSERT INTO proj_empresas (nome) VALUES
  ('Caiobá Motos'),
  ('Caiobá Trucks'),
  ('Caiobá Serviços'),
  ('Caiobá Participações'),
  ('Caiobá Transportes'),
  ('Caiobá Implementos'),
  ('Caiobá Locações'),
  ('Grupo Caiobá'),
  ('Caiobá Investimentos');

INSERT INTO proj_departamentos (nome) VALUES
  ('Contabilidade'),
  ('Financeiro'),
  ('Holding'),
  ('Peças'),
  ('Pós-Vendas'),
  ('RH'),
  ('Serviços'),
  ('Tecnologia'),
  ('Vendas');

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
  ('Vendas');

INSERT INTO proj_status (nome) VALUES
  ('Mapeado'),
  ('Programado'),
  ('Em Andamento'),
  ('Pausado'),
  ('Concluído');

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
  ('Publicação');
