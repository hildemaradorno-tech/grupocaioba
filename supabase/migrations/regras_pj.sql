-- Regras PJ: valor fixo da prestação de serviços (PJ) por cargo. Gravada em fato_politica_comissao
-- com prestacao_pj = true (comissao_valor = valor fixo do mês, sem Fonte/Base) — assim entra nas
-- telas de Comissões, Processamento, PDF e TXT com código/rubrica como qualquer política.
-- Some da tela Política de Comissões (que lista só prestacao_pj = false).
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS prestacao_pj boolean NOT NULL DEFAULT false;

-- Permissão 'regras-pj': toda policy que libera por 'regras-faixas' passa a liberar também 'regras-pj'
-- (política, rubricas, cargos, tipos de processo...). Ninguém ganha o menu aqui — libera em Grupos de Acesso.
DO $$
DECLARE
  p record;
  de text := '''regras-faixas''::text';
  para text := '''regras-faixas''::text, ''regras-pj''::text';
  sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%' || de || '%'
      AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%regras-pj%'
  LOOP
    sql := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF p.qual IS NOT NULL THEN sql := sql || ' USING (' || replace(p.qual, de, para) || ')'; END IF;
    IF p.with_check IS NOT NULL THEN sql := sql || ' WITH CHECK (' || replace(p.with_check, de, para) || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
