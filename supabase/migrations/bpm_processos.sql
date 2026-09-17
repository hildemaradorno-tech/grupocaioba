-- Módulo BPM — Motor de Processos (BPMN 2.0)
-- Catálogo de definições de processo (bpmn_xml + formulários por etapa + matriz de alçadas),
-- instâncias em execução, tarefas humanas/de serviço, log de auditoria imutável e comentários.
-- Nenhuma tabela é modelada em torno de "nota fiscal" — o processo de cancelamento/devolução é
-- apenas a primeira definição publicada no catálogo.

CREATE TABLE IF NOT EXISTS bpm_process_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  nome text NOT NULL,
  descricao text,
  versao int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho', -- rascunho | publicado | arquivado
  bpmn_xml text NOT NULL,
  form_schemas jsonb NOT NULL DEFAULT '{}'::jsonb,
  regras_alcada jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  publicado_em timestamptz,
  UNIQUE (chave, versao)
);

ALTER TABLE bpm_process_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_process_definitions;
CREATE POLICY "auth_all" ON bpm_process_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bpm_process_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_definition_id uuid NOT NULL REFERENCES bpm_process_definitions(id),
  titulo text,
  status text NOT NULL DEFAULT 'em_andamento', -- em_andamento | concluido | pendencia_manual | cancelado
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  elemento_atual_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  iniciado_por uuid REFERENCES auth.users(id),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);

ALTER TABLE bpm_process_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_process_instances;
CREATE POLICY "auth_all" ON bpm_process_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bpm_instances_definition ON bpm_process_instances(process_definition_id);
CREATE INDEX IF NOT EXISTS idx_bpm_instances_status ON bpm_process_instances(status);

CREATE TABLE IF NOT EXISTS bpm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES bpm_process_instances(id) ON DELETE CASCADE,
  elemento_id text NOT NULL,
  elemento_nome text,
  tipo text NOT NULL DEFAULT 'user', -- user | service
  status text NOT NULL DEFAULT 'aberta', -- aberta | concluida | cancelada
  responsavel_user_id uuid REFERENCES auth.users(id),
  responsavel_papel text,
  prazo_em timestamptz,
  decisao text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criada_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  concluida_por uuid REFERENCES auth.users(id)
);

ALTER TABLE bpm_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_tasks;
CREATE POLICY "auth_all" ON bpm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bpm_tasks_instance ON bpm_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_bpm_tasks_status_responsavel ON bpm_tasks(status, responsavel_user_id);

CREATE TABLE IF NOT EXISTS bpm_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES bpm_process_instances(id) ON DELETE CASCADE,
  task_id uuid REFERENCES bpm_tasks(id) ON DELETE SET NULL,
  ator_user_id uuid REFERENCES auth.users(id),
  acao text NOT NULL,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bpm_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_audit_log;
CREATE POLICY "auth_all" ON bpm_audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bpm_audit_instance ON bpm_audit_log(instance_id);

CREATE TABLE IF NOT EXISTS bpm_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES bpm_process_instances(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bpm_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_comments;
CREATE POLICY "auth_all" ON bpm_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bpm_comments_instance ON bpm_comments(instance_id);
