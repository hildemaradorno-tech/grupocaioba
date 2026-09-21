-- Controle de baixa de títulos TruckPag — tabela separada de truckpag_titulos/truckpag_repasses
-- de propósito: essas duas são snapshot (apagadas e recriadas a cada "Atualizar do SharePoint"),
-- então um campo de controle dentro delas se perderia. Aqui fica só "este título já foi exportado
-- em Exportar Baixa" — usado pro ícone azul (a baixar) / cinza (já baixado) na coluna Situação.

CREATE TABLE IF NOT EXISTS truckpag_baixas_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_codigo bigint NOT NULL UNIQUE,
  titulo_numero text,
  baixado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truckpag_baixas_titulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_baixas_titulos;
CREATE POLICY "auth_all" ON truckpag_baixas_titulos FOR ALL TO authenticated USING (true) WITH CHECK (true);
