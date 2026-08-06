-- Ações de permissão por menu (além do acesso binário já existente em permissoes_grupo).
-- Usado inicialmente só por 'calculo-comissoes': 'conferir' (Gerente) e 'processar' (RH).
CREATE TABLE IF NOT EXISTS permissoes_grupo_acoes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id  uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  menu_path text NOT NULL,
  acao      text NOT NULL,
  UNIQUE (grupo_id, menu_path, acao)
);
ALTER TABLE permissoes_grupo_acoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON permissoes_grupo_acoes;
CREATE POLICY "auth_all" ON permissoes_grupo_acoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lote de aprovação: agrupa todas as comissões calculadas/salvas de um período
-- (Rascunho -> Conferido pelo Gerente -> Processado pelo RH; RH pode reabrir pra reprocessar).
CREATE TABLE IF NOT EXISTS fato_comissoes_lotes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio   date NOT NULL,
  periodo_fim      date NOT NULL,
  status           text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'CONFERIDO', 'PROCESSADO')),
  qtd_funcionarios integer,
  valor_total      numeric,
  conferido_por    text,
  conferido_em     timestamptz,
  processado_por   text,
  processado_em    timestamptz,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo_inicio, periodo_fim)
);
ALTER TABLE fato_comissoes_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_comissoes_lotes;
CREATE POLICY "auth_all" ON fato_comissoes_lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trilha de auditoria: uma linha por transição de status do lote.
CREATE TABLE IF NOT EXISTS fato_comissoes_lotes_historico (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id          uuid NOT NULL REFERENCES fato_comissoes_lotes(id) ON DELETE CASCADE,
  acao             text NOT NULL CHECK (acao IN ('CRIADO', 'CONFERIDO', 'PROCESSADO', 'REPROCESSAMENTO_AUTORIZADO')),
  usuario          text,
  valor_no_momento numeric,
  data_hora        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fato_comissoes_lotes_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_comissoes_lotes_historico;
CREATE POLICY "auth_all" ON fato_comissoes_lotes_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Liga cada comissão calculada/salva ao lote de aprovação do seu período.
ALTER TABLE fato_comissoes_calculadas ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES fato_comissoes_lotes(id) ON DELETE SET NULL;
