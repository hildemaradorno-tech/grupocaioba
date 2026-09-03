-- ============================================================
-- MÓDULO: Gestão de Projetos — Período de Manifestação (Etapa 2)
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Flags de comportamento no catálogo de fases já existente
ALTER TABLE proj_fases ADD COLUMN IF NOT EXISTS aciona_manifestacao boolean NOT NULL DEFAULT false;
ALTER TABLE proj_fases ADD COLUMN IF NOT EXISTS aciona_consolidacao  boolean NOT NULL DEFAULT false;

INSERT INTO proj_fases (nome, aciona_manifestacao) VALUES ('Manifestação', true)
  ON CONFLICT (nome) DO UPDATE SET aciona_manifestacao = true;
INSERT INTO proj_fases (nome, aciona_consolidacao) VALUES ('Consolidado e Encerramento', true)
  ON CONFLICT (nome) DO UPDATE SET aciona_consolidacao = true;

-- 2. Estado do período de manifestação, por projeto
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_status text NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_prazo date;
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_encerrada_em timestamptz;
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_encerrada_por text;

ALTER TABLE proj_projetos DROP CONSTRAINT IF EXISTS proj_projetos_manifestacao_status_check;
ALTER TABLE proj_projetos ADD CONSTRAINT proj_projetos_manifestacao_status_check
  CHECK (manifestacao_status IN ('nao_iniciado','aberto','encerrado'));

-- 3. Convidados a manifestar (participantes selecionados ao iniciar a fase)
CREATE TABLE IF NOT EXISTS proj_manifestacao_convidados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id  uuid NOT NULL REFERENCES proj_projetos(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proj_manif_convidado_unico UNIQUE (projeto_id, usuario_id)
);

-- 4. Manifestações
CREATE TABLE IF NOT EXISTS proj_manifestacoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id            uuid NOT NULL REFERENCES proj_projetos(id) ON DELETE CASCADE,
  usuario_email         text NOT NULL,
  usuario_nome          text,
  data_hora_envio       timestamptz NOT NULL DEFAULT now(),
  tipo_manifestacao     text NOT NULL,
  texto_manifestacao    text,
  link_pasta_sharepoint text,
  status                text NOT NULL DEFAULT 'Pendente',
  resposta_responsavel  text,
  responsavel_email     text,
  responsavel_nome      text,
  data_hora_resposta    timestamptz,

  CONSTRAINT proj_manif_tipo_check   CHECK (tipo_manifestacao IN ('Sugestão','Correção','Inclusão','Dúvida','De Acordo')),
  CONSTRAINT proj_manif_status_check CHECK (status IN ('Pendente','Em Análise','Respondido'))
);

CREATE INDEX IF NOT EXISTS proj_manifestacoes_projeto_idx ON proj_manifestacoes (projeto_id);

-- 5. Dedup de lembretes por e-mail (evita reenvio no mesmo dia se o scheduler reiniciar)
CREATE TABLE IF NOT EXISTS proj_manifestacao_lembretes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id  uuid NOT NULL REFERENCES proj_projetos(id) ON DELETE CASCADE,
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dias_antes  integer NOT NULL,
  enviado_em  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proj_manif_lembrete_unico UNIQUE (projeto_id, usuario_id, dias_antes)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE proj_manifestacao_convidados ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_manifestacoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE proj_manifestacao_lembretes  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON proj_manifestacao_convidados;
DROP POLICY IF EXISTS "auth_all" ON proj_manifestacoes;
DROP POLICY IF EXISTS "auth_all" ON proj_manifestacao_lembretes;

CREATE POLICY "auth_all" ON proj_manifestacao_convidados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_manifestacoes           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON proj_manifestacao_lembretes  FOR ALL TO authenticated USING (true) WITH CHECK (true);
