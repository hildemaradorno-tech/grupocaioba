-- Tolerância de diferença de taxa — compara (Saldo do título - Valor Recebido do repasse) com o
-- Valor Taxa esperado (3% do título) na tela de Repasses TruckPag. Dentro da tolerância: verde.
-- Fora: mostra a diferença em vermelho. Mesma tabela de linha única da Tolerância de Valor.
ALTER TABLE truckpag_config_conciliacao
  ADD COLUMN IF NOT EXISTS tolerancia_taxa numeric(10,2) NOT NULL DEFAULT 0.50;
