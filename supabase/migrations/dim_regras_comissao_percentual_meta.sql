-- Faixa de Regra por % de Meta Atingida (além do modo já existente, por valor em R$): compara
-- o percentual atingido (valor apurado da Base de Cálculo ÷ Meta cadastrada em Planejamento de
-- Metas) contra as faixas, em vez do valor em R$ direto. `meta_tipo` guarda o mesmo "tipo" usado
-- em fato_metas_publicadas (pecas, mecanico, consultor, funilaria, terceiros) — a meta é buscada
-- por colaborador_id + ano + mês do período calculado + esse tipo.
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS tipo_faixa text NOT NULL DEFAULT 'VALOR' CHECK (tipo_faixa IN ('VALOR', 'PERCENTUAL_META'));
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS meta_tipo text;
