-- Motor de Medidas BI com corte por dimensão — cadastro PRÓPRIO do BI, independente de
-- Comissões (não referencia dim_fontes_calculo/dim_bases_calculo/dim_regras_calculo).
--
-- Substitui por completo o cadastro antigo dim_medidas_bi (que reaproveitava
-- dim_fontes_calculo e tinha um "Copiar para Base de Cálculo" ligando pra Comissões).

DROP TABLE IF EXISTS dim_medidas_bi_regra_condicoes CASCADE;
DROP TABLE IF EXISTS dim_medidas_bi_regras CASCADE;
DROP TABLE IF EXISTS dim_medidas_bi CASCADE;

-- Cadastro do arquivo/pasta SharePoint — mesma forma de dim_fontes_calculo, mas tabela própria.
-- coluna_tipo_os / coluna_natureza_operacao / coluna_movimento são opcionais: a maioria dos
-- arquivos não tem departamento/setor direto (isso vem do Funcionário via dim_funcionarios),
-- mas pode ter uma dessas 3 colunas de classificação.
CREATE TABLE IF NOT EXISTS dim_fontes_bi (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                      text NOT NULL,
  codigo                    text NOT NULL UNIQUE,
  descricao                 text,
  pasta_sharepoint          text,
  prefixo_arquivo           text,
  usa_subpasta_ano          boolean NOT NULL DEFAULT false,
  linha_cabecalho           integer NOT NULL DEFAULT 0,
  coluna_empresa            text,
  coluna_data               text,
  coluna_funcionario        text,
  coluna_tipo_os            text,
  coluna_natureza_operacao  text,
  coluna_movimento          text,
  ativo                     boolean NOT NULL DEFAULT true,
  criado_em                 timestamptz NOT NULL DEFAULT now(),
  atualizado_em             timestamptz NOT NULL DEFAULT now()
);

-- Medida = coluna + agregação (SOMA/CONTAGEM/MEDIA), igual ao motor de Base de Cálculo,
-- mas sem "Destino BI" de slot fixo — o corte por dimensão é escolhido dinamicamente na
-- tela de Conferência (Funcionário / Tipo de OS / Natureza de Operação / Movimento).
CREATE TABLE IF NOT EXISTS dim_medidas_bi (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_bi_id       uuid NOT NULL REFERENCES dim_fontes_bi(id) ON DELETE RESTRICT,
  nome              text NOT NULL,
  codigo            text NOT NULL UNIQUE,
  descricao         text,
  coluna_valor      text,
  tipo_agregacao    text NOT NULL DEFAULT 'SOMA' CHECK (tipo_agregacao IN ('SOMA', 'CONTAGEM', 'MEDIA')),
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

-- Regras/condições — cópia exata do motor já validado em dim_regras_calculo/dim_regra_condicoes.
CREATE TABLE IF NOT EXISTS dim_medidas_bi_regras (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medida_bi_id      uuid NOT NULL REFERENCES dim_medidas_bi(id) ON DELETE CASCADE,
  ordem             integer NOT NULL DEFAULT 0,
  tipo_acao         text NOT NULL CHECK (tipo_acao IN (
                       'FILTRAR', 'DEFINIR_VALOR', 'INVERTER_SINAL', 'FORCAR_NEGATIVO', 'FORCAR_POSITIVO',
                       'SOMAR_COLUNA', 'SUBTRAIR_COLUNA', 'MULTIPLICAR_COLUNA', 'DIVIDIR_COLUNA'
                     )),
  coluna_alvo       text,
  condicao_logica   text CHECK (condicao_logica IN ('E', 'OU')),
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dim_medidas_bi_regra_condicoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id     uuid NOT NULL REFERENCES dim_medidas_bi_regras(id) ON DELETE CASCADE,
  ordem        integer NOT NULL DEFAULT 0,
  coluna       text NOT NULL,
  operador     text NOT NULL CHECK (operador IN (
                  'IGUAL', 'DIFERENTE', 'CONTEM', 'NAO_CONTEM', 'COMECA_COM', 'NAO_COMECA_COM',
                  'EM_BRANCO', 'NAO_EM_BRANCO', 'SETOR_OS_IGUAL', 'SETOR_OS_DIFERENTE'
                )),
  valor        text,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medidas_bi_regras_medida ON dim_medidas_bi_regras(medida_bi_id, ordem);
CREATE INDEX IF NOT EXISTS idx_medidas_bi_regra_condicoes_regra ON dim_medidas_bi_regra_condicoes(regra_id, ordem);

ALTER TABLE dim_fontes_bi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_fontes_bi;
CREATE POLICY "auth_all" ON dim_fontes_bi FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_medidas_bi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi;
CREATE POLICY "auth_all" ON dim_medidas_bi FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_medidas_bi_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi_regras;
CREATE POLICY "auth_all" ON dim_medidas_bi_regras FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_medidas_bi_regra_condicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi_regra_condicoes;
CREATE POLICY "auth_all" ON dim_medidas_bi_regra_condicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
