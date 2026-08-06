-- ============================================================
-- Grade de Treinamentos: vínculo curso × cargo passa a indicar
-- se o curso é OBRIGATÓRIO (true) ou SUGERIDO (false) para o
-- cargo. Vínculos existentes ficam como obrigatórios.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE trein_curso_cargos
  ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT true;
