-- Garantias DAF — cores da coluna Dias (tabela da aba Com Garantista), editáveis na engrenagem
-- (Regras — Com Garantista). Dias = da criação da O.S. até hoje.
--   verde: abaixo de dias_cor_amarelo · amarelo: de dias_cor_amarelo até dias_cor_vermelho · vermelho: acima de dias_cor_vermelho
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_cor_amarelo INTEGER NOT NULL DEFAULT 20;
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_cor_vermelho INTEGER NOT NULL DEFAULT 30;
NOTIFY pgrst, 'reload schema';
