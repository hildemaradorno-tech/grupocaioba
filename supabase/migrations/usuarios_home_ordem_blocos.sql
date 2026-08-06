-- ============================================================
-- Guarda a ordem personalizada dos blocos de menu da tela Home,
-- por usuário, para persistir entre dispositivos (celular, outros
-- computadores etc.) em vez de ficar só no localStorage do navegador.
-- NULL = usuário não personalizou, mantém ordem alfabética padrão.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS home_ordem_blocos jsonb;
