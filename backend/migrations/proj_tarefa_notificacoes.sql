-- Deduplicação de notificações de vencimento de tarefas de projetos
-- Uma linha por (tarefa, tipo, data_ref) — impede reenvio no mesmo evento

CREATE TABLE IF NOT EXISTS proj_tarefa_notificacoes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES proj_tarefas(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,  -- '1_dia_antes' | 'no_dia' | '1_dia_apos'
  data_ref  DATE NOT NULL,  -- data_fim da tarefa no momento do envio
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tarefa_id, tipo, data_ref)
);
