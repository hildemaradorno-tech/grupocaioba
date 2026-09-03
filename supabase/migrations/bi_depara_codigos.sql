-- De-Para de Códigos — cadastro genérico e ADITIVO pro motor de BI (Fontes/Medidas BI). Não
-- mexe em Funcionário (resolve pela hierarquia dim_funcionarios) nem em Tipo de OS/Natureza de
-- Operação/Tipo de Movimento (que já têm cadastro próprio usado em outras telas do sistema,
-- dim_tipos_os/dim_natureza_operacoes/dim_movimento_venda) — serve pra QUALQUER OUTRA coluna
-- codificada que apareça num arquivo (ex: NF_NatOperCod, ProdTipoCod) e que ainda não tenha
-- um cadastro dedicado. Reaproveitável entre Fontes BI diferentes: o De-Para em si (dim_bi_depara
-- + dim_bi_depara_valores) é independente de Fonte; quem liga um De-Para a uma coluna de um
-- arquivo específico é dim_fontes_bi_colunas_depara.

-- A lista nomeada (ex: "Tipo de Produto")
CREATE TABLE IF NOT EXISTS dim_bi_depara (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  codigo        text NOT NULL UNIQUE,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Os pares código bruto -> nome de exibição
CREATE TABLE IF NOT EXISTS dim_bi_depara_valores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depara_id       uuid NOT NULL REFERENCES dim_bi_depara(id) ON DELETE CASCADE,
  codigo_bruto    text NOT NULL,
  nome_exibicao   text NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depara_id, codigo_bruto)
);

-- Liga uma coluna de UMA Fonte BI a um De-Para — várias colunas (de fontes diferentes ou da
-- mesma fonte) podem apontar pro mesmo De-Para reaproveitado.
CREATE TABLE IF NOT EXISTS dim_fontes_bi_colunas_depara (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_bi_id     uuid NOT NULL REFERENCES dim_fontes_bi(id) ON DELETE CASCADE,
  coluna_arquivo  text NOT NULL,
  depara_id       uuid NOT NULL REFERENCES dim_bi_depara(id) ON DELETE RESTRICT,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fonte_bi_id, coluna_arquivo)
);

CREATE INDEX IF NOT EXISTS idx_bi_depara_valores_depara ON dim_bi_depara_valores(depara_id);
CREATE INDEX IF NOT EXISTS idx_fontes_bi_colunas_depara_fonte ON dim_fontes_bi_colunas_depara(fonte_bi_id);

ALTER TABLE dim_bi_depara ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_bi_depara;
CREATE POLICY "auth_all" ON dim_bi_depara FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_bi_depara_valores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_bi_depara_valores;
CREATE POLICY "auth_all" ON dim_bi_depara_valores FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_fontes_bi_colunas_depara ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_fontes_bi_colunas_depara;
CREATE POLICY "auth_all" ON dim_fontes_bi_colunas_depara FOR ALL TO authenticated USING (true) WITH CHECK (true);
