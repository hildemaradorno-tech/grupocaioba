-- Tabela de deliberações por tarefa (log de reuniões)
CREATE TABLE IF NOT EXISTS proj_deliberacoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  uuid NOT NULL REFERENCES proj_tarefas(id) ON DELETE CASCADE,
  data       date NOT NULL DEFAULT CURRENT_DATE,
  texto      text NOT NULL,
  criado_por text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proj_deliberacoes_tarefa_idx ON proj_deliberacoes (tarefa_id, data DESC);

ALTER TABLE proj_deliberacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON proj_deliberacoes;
CREATE POLICY "auth_all" ON proj_deliberacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
