-- Placa do veículo da OS (ROF001 Veiculo_Placa / ROF017 OS_VeiculoPlaca) — usada na Nota de Débito.
ALTER TABLE gar_garantias ADD COLUMN IF NOT EXISTS placa TEXT;
