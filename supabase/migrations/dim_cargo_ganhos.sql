-- Descrições de Ganho cadastradas manualmente por cargo (ex: Salário Fixo, Bonificação, Prêmio) —
-- usadas no módulo "Cargos e Remunerações" junto com as Políticas de Comissão e a linha fixa de
-- DSR. Escopo por Cargo + Agrupamento de Empresas, mesmo padrão da Política de Comissão.
CREATE TABLE IF NOT EXISTS dim_cargo_ganhos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id                uuid NOT NULL REFERENCES dim_cargos(id) ON DELETE CASCADE,
  agrupamento_empresa_id  uuid REFERENCES dim_agrupamento_empresas(id) ON DELETE SET NULL,
  descricao               text NOT NULL,     -- ex: "Salário Fixo", "Bonificação"
  metrica                 text,              -- base/métrica livre, ex: "Mensal", "Meta de Vendas"
  tipo_valor              text NOT NULL DEFAULT 'VALOR_FIXO' CHECK (tipo_valor IN ('PERCENTUAL', 'VALOR_FIXO')),
  valor                   numeric,
  ordem                   integer NOT NULL DEFAULT 0,
  ativo                   boolean NOT NULL DEFAULT true,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  atualizado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cargo_ganhos_cargo ON dim_cargo_ganhos(cargo_id);

ALTER TABLE dim_cargo_ganhos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_cargo_ganhos;
CREATE POLICY "auth_all" ON dim_cargo_ganhos FOR ALL TO authenticated USING (true) WITH CHECK (true);
