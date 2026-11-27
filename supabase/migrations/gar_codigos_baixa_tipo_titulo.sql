-- Códigos de tipo de título do arquivo de baixa (.txt, Dealer.net › Banco Retorno) do Extrato de
-- Pagamento DAF — antes fixo no código (CODIGO_BAIXA_POR_TIPO em ExtratoPagamentoDaf.jsx, só
-- "GARANTIA FABRICA" = 4); agora cadastrável pela tela (engrenagem → Códigos de Tipo de Título),
-- pra não precisar de código novo a cada tipo de título diferente (ex.: PLANO MANUTENCAO DAF).
-- `tipo_titulo` guarda a chave já normalizada (maiúsculo, sem acento, espaços colapsados — mesma
-- normalização de chaveTipo() no front) pra bater direto na busca, sem repetir a normalização no SQL.
CREATE TABLE IF NOT EXISTS gar_codigos_baixa_tipo_titulo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_titulo text NOT NULL UNIQUE,
  codigo text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gar_codigos_baixa_tipo_titulo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo" ON gar_codigos_baixa_tipo_titulo;
CREATE POLICY "por_modulo" ON gar_codigos_baixa_tipo_titulo FOR ALL TO authenticated
USING ((SELECT sec_tem_menu_like('garantia', 'bi/garantias')))
WITH CHECK ((SELECT sec_tem_menu_like('garantia', 'bi/garantias')));

-- Semente: o código que já existia fixo no front, pra não regredir quem já usa Garantia Fábrica.
INSERT INTO gar_codigos_baixa_tipo_titulo (tipo_titulo, codigo)
VALUES ('GARANTIA FABRICA', '4')
ON CONFLICT (tipo_titulo) DO NOTHING;
