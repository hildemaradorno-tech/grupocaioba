-- Centro de Resultado: o mesmo código pode existir em sistemas diferentes. A unicidade passa a
-- ser (sistema, código) em vez de só código. NULLS NOT DISTINCT: dois centros sem sistema com o
-- mesmo código continuam sendo duplicata.
ALTER TABLE ctb_centros_resultado DROP CONSTRAINT IF EXISTS ctb_centros_resultado_codigo_key;
ALTER TABLE ctb_centros_resultado
  ADD CONSTRAINT ctb_centros_resultado_sistema_codigo_key UNIQUE NULLS NOT DISTINCT (sistema_id, codigo);
