-- Supabase migration: add editar/excluir to permissoes_telas
-- Execute no SQL Editor do Supabase se a tabela já existir sem essas colunas.

ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS editar BOOLEAN DEFAULT true;
ALTER TABLE permissoes_telas ADD COLUMN IF NOT EXISTS excluir BOOLEAN DEFAULT true;
