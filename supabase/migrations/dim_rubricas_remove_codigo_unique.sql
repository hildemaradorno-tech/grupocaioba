-- O código da rubrica pode se repetir entre empresas diferentes (o mesmo número identifica uma
-- rubrica de comissão distinta em cada empresa) — a restrição UNIQUE impedia cadastrar mais de
-- uma rubrica com o mesmo código, mesmo quando são de empresas diferentes.
ALTER TABLE dim_rubricas DROP CONSTRAINT IF EXISTS dim_rubricas_codigo_key;
