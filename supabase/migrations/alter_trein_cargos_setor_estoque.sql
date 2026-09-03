-- ============================================================
-- MÓDULO: Grade de Treinamentos — novo Setor "Estoque de Peças"
-- Adiciona o valor ao CHECK de trein_cargos.setor.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE trein_cargos DROP CONSTRAINT IF EXISTS trein_cargos_setor_check;

ALTER TABLE trein_cargos
  ADD CONSTRAINT trein_cargos_setor_check
  CHECK (setor IN ('Peças','Estoque de Peças','Serviços','Administrativo','Loja'));
