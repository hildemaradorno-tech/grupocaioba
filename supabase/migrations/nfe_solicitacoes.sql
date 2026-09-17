-- Módulo Cancelamento/Devolução de NF-e — motor simples de etapas sequenciais (substitui o uso
-- do motor BPMN/bpmn-js pra esse fluxo específico, a pedido do usuário: lista fixa de etapas, na
-- mesma ordem, cada uma com um setor responsável e um prazo — sem gateway condicional visual).
-- As tabelas bpm_* (motor BPMN genérico) continuam existindo, só não são mais usadas por essa tela.

CREATE TABLE IF NOT EXISTS nfe_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem int NOT NULL UNIQUE,
  nome text NOT NULL,
  papel text NOT NULL, -- setor responsável: fiscal | financeiro | estoque | gerencia (texto livre)
  prazo_horas int,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nfe_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON nfe_etapas;
CREATE POLICY "auth_all" ON nfe_etapas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS nfe_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nf text, serie text, chave_acesso text, natureza_operacao text, nota_referenciada text,
  tipo_nota text, cliente text, cnpj_cliente text, data_nf date, valor_nf numeric(14,2),
  tipo_item text, tipo_devolucao text, motivo text, observacao text,
  dentro_prazo_sefaz boolean,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  itens_devolvidos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'em_andamento', -- em_andamento | aprovado | reprovado
  etapa_atual_id uuid REFERENCES nfe_etapas(id),
  etapa_atual_nome text,
  etapa_atual_papel text,
  etapa_atual_responsavel_user_id uuid REFERENCES auth.users(id),
  etapa_atual_prazo_em timestamptz,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);

ALTER TABLE nfe_solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON nfe_solicitacoes;
CREATE POLICY "auth_all" ON nfe_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_nfe_solicitacoes_status ON nfe_solicitacoes(status);

CREATE TABLE IF NOT EXISTS nfe_solicitacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES nfe_solicitacoes(id) ON DELETE CASCADE,
  etapa_nome text,
  ator_user_id uuid REFERENCES auth.users(id),
  acao text NOT NULL, -- iniciada | aprovada | reprovada | comentario | assumida
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nfe_solicitacao_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON nfe_solicitacao_historico;
CREATE POLICY "auth_all" ON nfe_solicitacao_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_nfe_historico_solicitacao ON nfe_solicitacao_historico(solicitacao_id);

-- Etapas padrão (mesmo desenho do processo piloto anterior)
INSERT INTO nfe_etapas (ordem, nome, papel, prazo_horas) VALUES
  (1, 'Análise Fiscal', 'fiscal', 24),
  (2, 'Aprovação Financeira', 'financeiro', 24),
  (3, 'Conferência de Estoque', 'estoque', 24),
  (4, 'Validação Gerencial', 'gerencia', 48)
ON CONFLICT (ordem) DO NOTHING;
