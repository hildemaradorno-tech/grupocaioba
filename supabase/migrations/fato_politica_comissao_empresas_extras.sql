-- Política de Comissão: empresas que entram TAMBÉM na soma, além da empresa do funcionário
-- (Individual/Equipe) ou do Agrupamento dele (Empresa) — ex: Garantista de Campo Grande recebendo
-- também sobre outra loja. Vazio = comportamento de sempre. "Comissão sobre todas as empresas"
-- continua tendo prioridade.
ALTER TABLE fato_politica_comissao
  ADD COLUMN IF NOT EXISTS comissao_empresas_extras uuid[] NOT NULL DEFAULT '{}'::uuid[];

NOTIFY pgrst, 'reload schema';
