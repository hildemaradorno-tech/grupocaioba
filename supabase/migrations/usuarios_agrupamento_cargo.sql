-- Troca o campo "Cargo" do usuário (exato, por empresa) por "Agrupamento de Cargos" (mais
-- amplo, cobre variações do mesmo cargo entre empresas) — usado pra saber se o usuário pode
-- assumir tarefas do BPM restritas a um cargo. Migra o valor atual de cargo_id pro
-- agrupamento_id correspondente antes de remover a coluna antiga.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS agrupamento_cargo_id uuid REFERENCES dim_agrupamento_cargos(id);

UPDATE usuarios u
SET agrupamento_cargo_id = c.agrupamento_id
FROM dim_cargos c
WHERE c.id = u.cargo_id AND u.cargo_id IS NOT NULL AND u.agrupamento_cargo_id IS NULL;

ALTER TABLE usuarios DROP COLUMN IF EXISTS cargo_id;
