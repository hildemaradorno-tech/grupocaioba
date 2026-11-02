-- Descontos PJ (menu Descontos PJ): linha em fato_politica_comissao com prestacao_pj = true e
-- pj_desconto = { tipo: 'FIXO', valor } | { tipo: 'PERCENTUAL', itens, percentual_igual } | { tipo: 'LANCADO' }.
-- O valor lançado no mês usa a mesma tabela pj_coparticipacao_lancamentos (regra × funcionário × mês).
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_desconto jsonb;

-- Permissão 'descontos-pj': onde 'regras-pj' libera, libera também 'descontos-pj'.
DO $$
DECLARE
  p record;
  de text := '''regras-pj''::text';
  para text := '''regras-pj''::text, ''descontos-pj''::text';
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%' || de || '%'
      AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%descontos-pj%'
  LOOP
    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF p.qual IS NOT NULL THEN sql := sql || ' USING (' || replace(p.qual, de, para) || ')'; END IF;
    IF p.with_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || replace(p.with_check, de, para) || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
