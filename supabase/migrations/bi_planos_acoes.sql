-- BI Planos de Manutenção — ações das oportunidades.
-- bi_planos_acoes: cadastro das ações (engrenagem › Cadastro de ações). Não se apaga ação: desativa (some da lista
--   de escolha, mas continua aparecendo nas oportunidades que já usaram).
-- As oportunidades (com a ação escolhida e a descrição) ficam em bi_planos_oportunidades (bi_planos_oportunidades.sql).
CREATE TABLE IF NOT EXISTS bi_planos_acoes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome            text NOT NULL CHECK (length(trim(nome)) > 0),
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_por  text
);
CREATE UNIQUE INDEX IF NOT EXISTS bi_planos_acoes_nome_uk ON bi_planos_acoes (lower(trim(nome)));


ALTER TABLE bi_planos_acoes ENABLE ROW LEVEL SECURITY;

-- Ler: quem tem o menu do BI. Gravar: só quem tem a ação correspondente (admin sempre pode).
DROP POLICY IF EXISTS sel_menu ON bi_planos_acoes;
DROP POLICY IF EXISTS escrita_por_acao ON bi_planos_acoes;
CREATE POLICY sel_menu ON bi_planos_acoes FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/planos-manutencao'])));
CREATE POLICY escrita_por_acao ON bi_planos_acoes FOR ALL TO authenticated
  USING ((SELECT sec_tem_acao('bi/planos-manutencao', 'cadastrar_acoes')))
  WITH CHECK ((SELECT sec_tem_acao('bi/planos-manutencao', 'cadastrar_acoes')));

NOTIFY pgrst, 'reload schema';
