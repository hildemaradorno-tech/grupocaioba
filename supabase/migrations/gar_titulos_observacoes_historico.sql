-- Transforma gar_titulos_observacoes de "1 observação por título" (upsert por
-- nro_titulo) em histórico: várias observações por título, cada uma com id
-- próprio, editável/excluível individualmente.

-- Garante coluna id como chave primária.
ALTER TABLE public.gar_titulos_observacoes
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.gar_titulos_observacoes SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.gar_titulos_observacoes ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'gar_titulos_observacoes' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.gar_titulos_observacoes ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Remove qualquer constraint de unicidade em nro_titulo (impedia mais de uma
-- observação por título — era a base do upsert antigo).
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.gar_titulos_observacoes'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.gar_titulos_observacoes DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.gar_titulos_observacoes
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT now();

UPDATE public.gar_titulos_observacoes SET criado_em = atualizado_em WHERE criado_em IS NULL;
