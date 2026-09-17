-- Configuração do módulo TruckPag: lista de padrões de texto (contém, case-insensitive)
-- usados para filtrar quais créditos da tesouraria (RFN024) contam como "Saldo Concessionária"
-- na tela de Conciliação — casados contra a coluna Tesouraria_Observacao (ex: "TRUCKPA").
CREATE TABLE IF NOT EXISTS truckpag_config_tipos_saldo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truckpag_config_tipos_saldo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_config_tipos_saldo;
CREATE POLICY "auth_all" ON truckpag_config_tipos_saldo FOR ALL TO authenticated USING (true) WITH CHECK (true);
