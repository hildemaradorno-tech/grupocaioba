-- Troca "Meta de Equipe" de cargo-a-cargo pra Agrupamento de Cargos inteiro — mais rápido de
-- configurar (marca o agrupamento, todos os cargos dele entram na soma automaticamente) e
-- acompanha sozinho se um cargo mudar de agrupamento depois (resolvido na hora do cálculo, não
-- é uma cópia congelada). A coluna anterior (meta_equipe_cargo_ids) ainda não tinha sido usada
-- de verdade por nenhuma Regra — sem necessidade de migrar dados.
ALTER TABLE dim_regras_comissao DROP COLUMN IF EXISTS meta_equipe_cargo_ids;
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS meta_equipe_agrupamento_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
