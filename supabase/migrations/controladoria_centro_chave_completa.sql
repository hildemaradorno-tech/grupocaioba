-- Centro de Resultado passa a ser único por Sistema + Código + Descrição + Sigla:
-- o mesmo código pode existir no mesmo sistema com descrição/sigla diferentes.
ALTER TABLE ctb_centros_resultado DROP CONSTRAINT IF EXISTS ctb_centros_resultado_sistema_codigo_key;
ALTER TABLE ctb_centros_resultado DROP CONSTRAINT IF EXISTS ctb_centros_resultado_chave_key;
ALTER TABLE ctb_centros_resultado
  ADD CONSTRAINT ctb_centros_resultado_chave_key UNIQUE NULLS NOT DISTINCT (sistema_id, codigo, descricao, sigla);

NOTIFY pgrst, 'reload schema';
