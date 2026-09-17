-- Tolerância de valor pra vincular Repasse x Crédito na Conciliação TruckPag — configurável pelo
-- usuário (antes era fixa em R$0,02). Uma linha só, editada in-place (não é lista tipo Tipo de
-- Saldo). Aplica pra mais e pra menos (diferença absoluta <= tolerância concilia).
CREATE TABLE IF NOT EXISTS truckpag_config_conciliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tolerancia_valor numeric(10,2) NOT NULL DEFAULT 0.02,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truckpag_config_conciliacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_config_conciliacao;
CREATE POLICY "auth_all" ON truckpag_config_conciliacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO truckpag_config_conciliacao (tolerancia_valor)
SELECT 0.02
WHERE NOT EXISTS (SELECT 1 FROM truckpag_config_conciliacao);
