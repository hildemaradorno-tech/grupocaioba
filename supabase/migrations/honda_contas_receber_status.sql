-- Cadastro de Status do Contas a Receber HONDA (engrenagem ao lado de "Atualizar").
-- Os status cadastrados aqui alimentam o seletor de Status de cada título nas abas
-- (Garantias, Seguradoras...). A escolha por título fica em honda_contas_receber_anotacoes.status_id.

CREATE TABLE IF NOT EXISTS honda_contas_receber_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT 'slate',   -- slate | sky | amber | emerald | red | violet
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS honda_contas_receber_status_nome_uq ON honda_contas_receber_status (lower(nome));

ALTER TABLE honda_contas_receber_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON honda_contas_receber_status;
CREATE POLICY "auth_all" ON honda_contas_receber_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Excluir um status não apaga a anotação do título, só desvincula o status.
ALTER TABLE honda_contas_receber_anotacoes
  ADD COLUMN IF NOT EXISTS status_id uuid REFERENCES honda_contas_receber_status(id) ON DELETE SET NULL;
