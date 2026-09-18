-- Controle de baixa de títulos TruckPag — tabela separada de truckpag_titulos/truckpag_repasses
-- de propósito: essas duas são snapshot (apagadas e recriadas inteiras a cada "Atualizar do
-- SharePoint"), então um campo de controle dentro delas se perderia todo dia. Aqui o registro
-- sobrevive ao re-sync — usado pra esconder da tela Repasses os títulos já exportados em
-- "Exportar Baixa", e pra reexibi-los (delete do grupo) via botão "Baixados".

CREATE TABLE IF NOT EXISTS truckpag_baixas_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_codigo bigint NOT NULL UNIQUE,
  titulo_numero text,
  estabelecimento text,
  data_pagamento date,
  valor numeric(14,2),
  baixado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truckpag_baixas_titulos_grupo
  ON truckpag_baixas_titulos (estabelecimento, data_pagamento);

ALTER TABLE truckpag_baixas_titulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_baixas_titulos;
CREATE POLICY "auth_all" ON truckpag_baixas_titulos FOR ALL TO authenticated USING (true) WITH CHECK (true);
