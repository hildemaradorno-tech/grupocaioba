-- Regras PJ: empresas que pagam a prestação. pj_empresas = [{ empresa_id, empresa_nome, valor }];
-- pj_valor_diferente = false (mesmo valor pra todas) / true (valor por empresa). comissao_valor = total.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_empresas jsonb;
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_valor_diferente boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
