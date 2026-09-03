-- gar_garantias tinha índice único só por numero_os, impedindo que a mesma OS
-- tivesse mais de um registro de garantia com tipos diferentes (cenário real:
-- uma OS pode ter várias linhas de garantia no ROF001, uma por tipo). Isso
-- fazia a importação em lote falhar em massa com "duplicate key" ao tentar
-- inserir a 2ª+ linha da mesma OS.
-- Troca para único por (numero_os, tipo_os_sigla) — mesma chave composta já
-- usada pela lógica de "já importado" no frontend (numero_os + tipo).
DROP INDEX IF EXISTS gar_garantias_numero_os_idx;
CREATE UNIQUE INDEX IF NOT EXISTS gar_garantias_numero_os_tipo_idx
  ON public.gar_garantias (numero_os, tipo_os_sigla);
