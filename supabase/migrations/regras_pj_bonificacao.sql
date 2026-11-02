-- Regras PJ do tipo "Bonificação por Meta": pj_bonificacao = { empresa_ids, componentes
-- (balcao/oficina/funilaria — metas aprovadas de Pós-Vendas), base_ids (Bases do realizado),
-- faixas: [{ operador, valor (% atingido), premio (R$) }] }. Null nos outros tipos.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_bonificacao jsonb;

NOTIFY pgrst, 'reload schema';
