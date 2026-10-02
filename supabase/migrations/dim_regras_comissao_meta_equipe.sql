-- "Meta de Equipe": quando preenchido, a Regra por % de Meta Atingida (ou Valor Fixo por Meta)
-- compara com a SOMA das metas publicadas desses cargos no período, em vez da meta do próprio
-- funcionário — ex: um coordenador cuja meta é a soma dos vendedores do time dele, que nunca tem
-- meta publicada no próprio nome. Vazio (padrão) = comportamento de sempre (meta individual).
ALTER TABLE dim_regras_comissao ADD COLUMN IF NOT EXISTS meta_equipe_cargo_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
