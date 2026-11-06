-- Custos de Projetos (menu Gestão de Projetos → Custos de Projetos, permissão 'projetos/custos').
-- Cada lançamento: data, descrição, categoria (Desenvolvimento, Contratação...), valor e o projeto vinculado.
-- Obs.: o nome proj_custos já existe no banco (tabela antiga de custos mensais recorrentes + proj_custos_pagamentos,
-- com dados, sem uso no código atual) — por isso esta tabela é proj_custos_lancamentos e a antiga não é tocada.
-- Acesso (leitura e escrita) só para quem tem o menu liberado no grupo de acesso (ou admin).
CREATE TABLE IF NOT EXISTS proj_custos_lancamentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id    uuid NOT NULL REFERENCES proj_projetos(id) ON DELETE CASCADE,
  data          date NOT NULL,
  descricao     text NOT NULL,
  categoria     text NOT NULL,
  valor         numeric(14,2) NOT NULL DEFAULT 0,
  criado_por    text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proj_custos_lanc_projeto ON proj_custos_lancamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_proj_custos_lanc_data ON proj_custos_lancamentos(data);

ALTER TABLE proj_custos_lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS custos_por_menu ON proj_custos_lancamentos;
CREATE POLICY custos_por_menu ON proj_custos_lancamentos FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['projetos/custos'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['projetos/custos'])));

NOTIFY pgrst, 'reload schema';
