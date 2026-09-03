-- Link dos documentos de referência para o Período de Manifestação (Etapa 2).
-- Definido pelo responsável ao iniciar a fase; exibido na aba Manifestações
-- para que os participantes saibam onde encontrar os arquivos antes de manifestar.
ALTER TABLE proj_projetos ADD COLUMN IF NOT EXISTS manifestacao_link_docs text;
