-- BI Possibilidades - Sintonia do Dia: regras de cor (vermelho / amarelo / verde) dos indicadores (26/11/2026).
-- Uma linha só (id = 1). Verde a partir de *_verde; amarelo a partir de *_amarelo (e abaixo do verde); abaixo, vermelho.
--   realizado_*   : % Realizado (gauges "Realizado ... Acum %" e colunas % Peças / % Serv. / % Real)
--   possib_*      : % Possibilidades (gauge "Possibilidades %" e coluna % Possib.)
--   mrg_pecas_*   : % Margem de Peças (gauges de margem de peças e colunas % Mrg Peças)
--   mrg_serv_*    : % Margem de Serviços (gauge de margem de serviços e colunas % Mrg Serv)
-- Valores iniciais = as cores fixas que a tela já usava.
CREATE TABLE IF NOT EXISTS public.bi_possib_regras_cores (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  realizado_verde    numeric NOT NULL DEFAULT 100,
  realizado_amarelo  numeric NOT NULL DEFAULT 80,
  possib_verde       numeric NOT NULL DEFAULT 100,
  possib_amarelo     numeric NOT NULL DEFAULT 80,
  mrg_pecas_verde    numeric NOT NULL DEFAULT 70,
  mrg_pecas_amarelo  numeric NOT NULL DEFAULT 40,
  mrg_serv_verde     numeric NOT NULL DEFAULT 70,
  mrg_serv_amarelo   numeric NOT NULL DEFAULT 40,
  atualizado_em      timestamptz NOT NULL DEFAULT now(),
  CHECK (realizado_amarelo <= realizado_verde),
  CHECK (possib_amarelo <= possib_verde),
  CHECK (mrg_pecas_amarelo <= mrg_pecas_verde),
  CHECK (mrg_serv_amarelo <= mrg_serv_verde)
);
INSERT INTO public.bi_possib_regras_cores (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.bi_possib_regras_cores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON public.bi_possib_regras_cores;
DROP POLICY IF EXISTS sel_auth ON public.bi_possib_regras_cores;
DROP POLICY IF EXISTS escrita_por_menu ON public.bi_possib_regras_cores;
CREATE POLICY sel_auth ON public.bi_possib_regras_cores FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON public.bi_possib_regras_cores FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/possibilidades'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/possibilidades'])));
NOTIFY pgrst, 'reload schema';
