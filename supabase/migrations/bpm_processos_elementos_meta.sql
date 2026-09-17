-- Metadados por elemento do diagrama (responsável/prazo de user task, conector de service task).
-- Fica separado de form_schemas (que guarda só os campos de formulário de cada user task) e de
-- regras_alcada (reservada para a matriz de alçadas de uma fase futura).
ALTER TABLE bpm_process_definitions ADD COLUMN IF NOT EXISTS elementos_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
