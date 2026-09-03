-- Texto de orientação (rich HTML) definido pelo responsável ao iniciar a fase de
-- Manifestação. Exibido na aba Manifestações acima do banner de status para que
-- os participantes entendam o contexto antes de manifestar.
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_orientacao text;
