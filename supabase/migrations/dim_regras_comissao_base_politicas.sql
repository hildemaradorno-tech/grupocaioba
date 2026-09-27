-- Regra por % de Meta Atingida (Prêmio): o valor apurado da própria Base do Prêmio só serve
-- pra achar a % (via % atingido da Meta) — a comissão em si é essa % aplicada sobre a SOMA das
-- outras políticas escolhidas aqui (ex: Comissões s/Produção Individual + Comissão s/Time
-- Oficina), não sobre o valor apurado. Guarda os grupos de política (grupo_politica_id, ou o
-- próprio id quando a política não tem grupo — mesmo padrão já usado em vincularPoliticasRegra).
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS base_politica_ids uuid[] NOT NULL DEFAULT '{}';
