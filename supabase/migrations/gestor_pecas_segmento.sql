-- ============================================================
-- Gestor de Peças 2.0 — dois Gestores separados: 'trucks' (Caioba Trucks / Dealer.net, menus pecas/...)
-- e 'motos' (Caioba Motos / MicroWork, menus pecas-motos/...). Continuação de gestor_pecas.sql.
-- - pec_parametros: id 1 = trucks, id 2 = motos.
-- - Coluna segmento nas tabelas de decisões/snapshot/IA (registros existentes ficam como 'trucks').
-- - RLS: cada linha exige o menu do próprio Gestor (ou o BI correspondente); admin vê tudo.
-- Reversão: remover as colunas segmento, voltar o CHECK (id = 1) e reaplicar o bloco de RLS de gestor_pecas.sql.
-- ============================================================

ALTER TABLE public.pec_parametros DROP CONSTRAINT IF EXISTS pec_parametros_id_check;
ALTER TABLE public.pec_parametros ADD CONSTRAINT pec_parametros_id_check CHECK (id IN (1, 2));
INSERT INTO public.pec_parametros (id) VALUES (2) ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pec_sugestao_compra','pec_transferencia','pec_promocao','pec_snapshot_item','pec_ia_analise'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS segmento text NOT NULL DEFAULT ''trucks''', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_segmento_check');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (segmento IN (''trucks'',''motos''))', t, t || '_segmento_check');
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS pec_snapshot_item_segmento_idx ON public.pec_snapshot_item (segmento, codigo, data);

-- Expressões de acesso por Gestor ((SELECT ...) = avaliada uma vez por consulta)
-- trucks: menus 'pecas/...' ou BI 'bi/gestor-pecas' (exato — 'bi/gestor-pecas-motos' começa igual)
-- motos:  menus 'pecas-motos/...' ou BI 'bi/gestor-pecas-motos'
DO $$
DECLARE
  t text;
  trucks text := '(SELECT public.sec_tem_menu_like(''pecas/'') OR public.sec_tem_menu(''bi/gestor-pecas''))';
  motos  text := '(SELECT public.sec_tem_menu_like(''pecas-motos/'', ''bi/gestor-pecas-motos''))';
  regra  text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pec_sugestao_compra','pec_transferencia','pec_promocao','pec_snapshot_item','pec_ia_analise'] LOOP
    regra := format('((segmento = ''trucks'' AND %s) OR (segmento = ''motos'' AND %s))', trucks, motos);
    EXECUTE format('DROP POLICY IF EXISTS por_modulo ON public.%I', t);
    EXECUTE format('CREATE POLICY por_modulo ON public.%I FOR ALL TO authenticated USING %s WITH CHECK %s', t, regra, regra);
  END LOOP;

  regra := format('((id = 1 AND %s) OR (id = 2 AND %s))', trucks, motos);
  DROP POLICY IF EXISTS por_modulo ON public.pec_parametros;
  EXECUTE format('CREATE POLICY por_modulo ON public.pec_parametros FOR ALL TO authenticated USING %s WITH CHECK %s', regra, regra);

  -- Itens da promoção seguem a promoção (a RLS de pec_promocao vale dentro do EXISTS)
  DROP POLICY IF EXISTS por_modulo ON public.pec_promocao_itens;
  CREATE POLICY por_modulo ON public.pec_promocao_itens FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.pec_promocao p WHERE p.id = promocao_id))
    WITH CHECK (EXISTS (SELECT 1 FROM public.pec_promocao p WHERE p.id = promocao_id));
END $$;
