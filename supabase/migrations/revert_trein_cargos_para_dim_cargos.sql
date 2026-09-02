-- ============================================================
-- MÓDULO: Grade de Treinamentos — reverte para usar dim_cargos
-- Desfaz a migration trein_cargos_modulo.sql: os cargos da Grade de
-- Treinamentos voltam a vir do cadastro corporativo /cargos
-- (dim_cargos) em vez do cadastro próprio trein_cargos.
-- A tabela trein_cargos NÃO é dropada (fica no banco sem uso, como
-- já foi feito com trein_curso_agrupamentos) — só a FK muda de volta.
-- Executar no Supabase SQL Editor
-- ============================================================

-- Começar do zero de novo: os vínculos hoje apontam para trein_cargos,
-- cujos ids não têm correspondência em dim_cargos.
DELETE FROM trein_curso_cargos;

ALTER TABLE trein_curso_cargos DROP CONSTRAINT IF EXISTS trein_curso_cargos_cargo_id_fkey;
ALTER TABLE trein_curso_cargos
  ADD CONSTRAINT trein_curso_cargos_cargo_id_fkey
  FOREIGN KEY (cargo_id) REFERENCES dim_cargos(id) ON DELETE CASCADE;
