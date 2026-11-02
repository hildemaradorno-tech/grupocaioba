-- Regras PJ do tipo "Percentual": aplica % sobre o valor de outras regras PJ (Valor fixo e/ou
-- Variáveis) do mesmo cargo. pj_percentuais = [{ regra_id (grupo_politica_id), percentual }];
-- pj_valor_diferente = true quando cada regra tem seu %; comissao_total = % único (mesmo % pra todas).
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_percentual boolean NOT NULL DEFAULT false;
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_percentuais jsonb;

NOTIFY pgrst, 'reload schema';
