-- Adiciona colunas de Nota Fiscal (padrão e eletrônica de serviço) na posição de títulos
-- TruckPag, usadas na conciliação título × repasse.
ALTER TABLE truckpag_titulos
  ADD COLUMN IF NOT EXISTS titulo_nota_fiscal_numero text,
  ADD COLUMN IF NOT EXISTS titulo_nota_fiscal_elet_serv_numero text;
