-- Regras/configurações do módulo Garantias DAF — registro único (id sempre 1).
-- dias_digitacao: prazo (em dias) usado para separar A Digitar x Digitação Atrasada,
-- Aguardando Aprovação DAF (em dia x atrasado) e o alerta de OS na oficina sem movimentação.
CREATE TABLE IF NOT EXISTS gar_configuracoes (
  id INTEGER PRIMARY KEY DEFAULT 1,
  dias_digitacao INTEGER NOT NULL DEFAULT 14,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_por TEXT,
  CONSTRAINT gar_configuracoes_singleton CHECK (id = 1)
);

INSERT INTO gar_configuracoes (id, dias_digitacao)
VALUES (1, 14)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE gar_configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all ON gar_configuracoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
