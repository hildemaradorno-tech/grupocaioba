-- Fonte de Cálculo / Base de Cálculo
-- Cadastros que descrevem QUAL arquivo do SharePoint alimenta cada evento de comissão
-- e QUAL coluna/agregação extrai o valor. Substituem as listas fixas TIPOS_EVENTO/BASES_TIPO
-- que existiam hardcoded em src/pages/PoliticaComissao.jsx.

CREATE TABLE IF NOT EXISTS dim_fontes_calculo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              text NOT NULL,
  codigo            text NOT NULL UNIQUE,
  descricao         text,
  pasta_sharepoint  text,          -- ex: '/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos' (nullable: pode ser configurado depois)
  prefixo_arquivo   text,          -- ex: 'RPR001_VENDAPRODUTO'
  usa_subpasta_ano  boolean NOT NULL DEFAULT false,
  linha_cabecalho   integer NOT NULL DEFAULT 0, -- linhas de título acima do cabeçalho real (0 = cabeçalho é a 1ª linha)
  coluna_empresa    text,
  coluna_data       text,
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dim_bases_calculo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_calculo_id  uuid NOT NULL REFERENCES dim_fontes_calculo(id) ON DELETE RESTRICT,
  nome              text NOT NULL,
  codigo            text NOT NULL UNIQUE,
  descricao         text,
  coluna_valor      text,
  tipo_agregacao    text NOT NULL DEFAULT 'SOMA' CHECK (tipo_agregacao IN ('SOMA', 'CONTAGEM', 'MEDIA')),
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dim_fontes_calculo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_fontes_calculo;
CREATE POLICY "auth_all" ON dim_fontes_calculo FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_bases_calculo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_bases_calculo;
CREATE POLICY "auth_all" ON dim_bases_calculo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed de continuidade: mesmos códigos das listas hoje hardcoded em PoliticaComissao.jsx,
-- ainda sem mapeamento de arquivo SharePoint (o usuário completa depois pela tela de cadastro).
INSERT INTO dim_fontes_calculo (nome, codigo) VALUES
  ('OS Horas',          'OS_HORAS'),
  ('OS Serviço',        'OS_SERVICO'),
  ('Processo Recebido', 'PROCESSO_RECEBIDO'),
  ('Venda Balcão',      'VENDA_BALCAO'),
  ('Venda Balcão OS',   'VENDA_BALCAO_OS'),
  ('Venda OS',          'VENDA_OS')
ON CONFLICT (codigo) DO NOTHING;

-- Bases exigem uma fonte_calculo_id (FK NOT NULL); associa provisoriamente à primeira fonte
-- do seed acima. O usuário reajusta o vínculo correto pela tela de cadastro quando mapear os
-- arquivos reais do SharePoint.
INSERT INTO dim_bases_calculo (fonte_calculo_id, nome, codigo, tipo_agregacao)
SELECT id, 'Faturamento', 'FATURAMENTO', 'SOMA'
FROM dim_fontes_calculo WHERE codigo = 'OS_HORAS'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO dim_bases_calculo (fonte_calculo_id, nome, codigo, tipo_agregacao)
SELECT id, 'Horas', 'HORAS', 'SOMA'
FROM dim_fontes_calculo WHERE codigo = 'OS_HORAS'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO dim_bases_calculo (fonte_calculo_id, nome, codigo, tipo_agregacao)
SELECT id, 'Margem de Venda', 'MARGEM DE VENDA', 'MEDIA'
FROM dim_fontes_calculo WHERE codigo = 'VENDA_OS'
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO dim_bases_calculo (fonte_calculo_id, nome, codigo, tipo_agregacao)
SELECT id, 'Recebido', 'RECEBIDO', 'SOMA'
FROM dim_fontes_calculo WHERE codigo = 'PROCESSO_RECEBIDO'
ON CONFLICT (codigo) DO NOTHING;
