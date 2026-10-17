-- "Recalcular com Feriados" estava quebrando com "duplicate key value violates unique
-- constraint uq_fato_calendario_empresa_data" pra CAIOBÁ TRUCKS - CHAPADÃO: havia 2 linhas de
-- "ANIVERSÁRIO DE CHAPADÃO DO SUL" (23/10/2026) cadastradas pra mesma empresa, idênticas, por
-- um duplo-clique em "Incluir Feriado". O LEFT JOIN de gerar_calendario_anual() com
-- dim_calendario_feriados gerava 2 linhas pro mesmo dia e travava no INSERT em fato_calendario.
-- Achamos outro caso igual: CAIOBÁ TRUCKS - CAMPO GRANDE tinha "Véspera de Natal" (24/12/2025)
-- cadastrada 2x, uma FIXA (original) e uma MÓVEL (duplicata mais recente, incorreta — Véspera
-- de Natal é sempre 24/12 em qualquer ano, então o tipo certo é FIXA).
DELETE FROM public.dim_calendario_feriados WHERE id = '087f1732-9197-46f3-bd6e-ef69d37423b5';
DELETE FROM public.dim_calendario_feriados WHERE id = '41c9b158-cc96-4240-9e33-e799774ff6a8';

-- Trava a regra: nunca mais pode haver 2 feriados pra mesma empresa na mesma data.
ALTER TABLE public.dim_calendario_feriados
  ADD CONSTRAINT uq_dim_calendario_feriados_empresa_data UNIQUE (empresa_id, data_feriado);
