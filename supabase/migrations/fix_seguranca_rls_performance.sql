-- ============================================================
-- Performance das policies por perfil (sec_*).
-- Chamar sec_tem_menu_like(...) direto na policy faz o Postgres avaliar a função a CADA LINHA
-- (count(*) em truckpag_repasses levava ~3,8s). Envolvida em (SELECT ...) vira InitPlan e é
-- avaliada uma única vez por consulta. Reescreve todas as policies que chamam sec_* (idempotente:
-- policies já envolvidas em SELECT são ignoradas).
-- Reversão: reaplicar fix_seguranca_rls_por_perfil.sql / fix_seguranca_rls_modulos.sql.
-- ============================================================
DO $$
DECLARE
  r record;
  nq text;
  nw text;
  re text := '(sec_[a-z_]+\((?:[^()]|\([^()]*\))*\))';
  sql text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND (qual ~ 'sec_' OR with_check ~ 'sec_')
  LOOP
    nq := CASE WHEN r.qual ~ '\(\s*SELECT\s+(public\.)?sec_' THEN r.qual
               ELSE regexp_replace(r.qual, re, '(SELECT \1)', 'g') END;
    nw := CASE WHEN r.with_check ~ '\(\s*SELECT\s+(public\.)?sec_' THEN r.with_check
               ELSE regexp_replace(r.with_check, re, '(SELECT \1)', 'g') END;
    IF nq IS NOT DISTINCT FROM r.qual AND nw IS NOT DISTINCT FROM r.with_check THEN CONTINUE; END IF;

    sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    IF nq IS NOT NULL THEN sql := sql || format(' USING (%s)', nq); END IF;
    IF nw IS NOT NULL THEN sql := sql || format(' WITH CHECK (%s)', nw); END IF;
    EXECUTE sql;
  END LOOP;
END $$;
