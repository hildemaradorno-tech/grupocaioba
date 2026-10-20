ALTER TABLE proj_projetos
  ADD COLUMN IF NOT EXISTS responsavel2_id   uuid,
  ADD COLUMN IF NOT EXISTS responsavel2_nome text;
