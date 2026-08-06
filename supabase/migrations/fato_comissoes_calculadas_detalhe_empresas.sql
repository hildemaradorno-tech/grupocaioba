-- Guarda o detalhamento por empresa (política Nível EMPRESA + "Detalhar por empresa" marcado)
-- junto do registro salvo — sem isso, o detalhamento só existia em memória e sumia ao sair da
-- tela/reabrir o período, mesmo com o total já salvo.
ALTER TABLE fato_comissoes_calculadas
  ADD COLUMN IF NOT EXISTS detalhe_empresas jsonb;
