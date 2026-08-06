-- ============================================================
-- Ecossistema — cada sistema de um departamento passa a ter cor e
-- ícone/emoji próprios (antes era só um texto simples).
-- sistemas: text[] → jsonb (array de {nome, cor, icone, emoji})
--
-- Postgres não aceita subquery dentro de USING de um ALTER COLUMN TYPE,
-- então a conversão é feita em 3 passos: coluna nova + UPDATE (aqui sim
-- pode ter subquery) + troca de nome.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE ecossistema_departamentos
  ADD COLUMN IF NOT EXISTS sistemas_jsonb jsonb;

UPDATE ecossistema_departamentos
SET sistemas_jsonb = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('nome', s, 'cor', null, 'icone', null, 'emoji', null))
   FROM unnest(sistemas) AS s),
  '[]'::jsonb
);

ALTER TABLE ecossistema_departamentos
  ALTER COLUMN sistemas_jsonb SET DEFAULT '[]'::jsonb;

ALTER TABLE ecossistema_departamentos
  ALTER COLUMN sistemas_jsonb SET NOT NULL;

ALTER TABLE ecossistema_departamentos
  DROP COLUMN sistemas;

ALTER TABLE ecossistema_departamentos
  RENAME COLUMN sistemas_jsonb TO sistemas;
