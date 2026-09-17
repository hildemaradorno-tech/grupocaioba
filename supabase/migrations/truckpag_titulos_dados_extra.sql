-- Troca de fonte de títulos TruckPag para RFN003_PosicaoAnaliticoReceber_Excel — guarda a linha
-- crua inteira (todas as colunas do arquivo) em dados_extra, pra exibir na tela sem precisar
-- modelar cada coluna extra (Observ., Código Cliente, Placa, Chassi etc.) como campo próprio.
ALTER TABLE truckpag_titulos
  ADD COLUMN IF NOT EXISTS dados_extra jsonb;
