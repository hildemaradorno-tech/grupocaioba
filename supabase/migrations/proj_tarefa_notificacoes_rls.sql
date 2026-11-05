-- proj_tarefa_notificacoes (ver backend/migrations/proj_tarefa_notificacoes.sql): só o backend usa (service key,
-- ignora RLS). RLS ligada sem policies = usuários logados não leem nem alteram direto.
ALTER TABLE proj_tarefa_notificacoes ENABLE ROW LEVEL SECURITY;
