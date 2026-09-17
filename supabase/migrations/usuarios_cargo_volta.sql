-- Reverte usuarios_agrupamento_cargo.sql: volta a usar Cargo específico em vez de Agrupamento
-- de Cargos. Nenhum usuário tinha agrupamento_cargo_id preenchido até agora, então não há
-- dado a migrar de volta.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES dim_cargos(id);
ALTER TABLE usuarios DROP COLUMN IF EXISTS agrupamento_cargo_id;
