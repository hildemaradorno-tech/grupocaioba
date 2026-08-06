-- Medidas de BI — cadastro dedicado a alimentar dashboards de BI, separado da Base de Cálculo
-- (que serve ao Cálculo de Comissões). Reaproveita dim_fontes_calculo (mesmo cadastro de
-- arquivo/pasta do SharePoint), mas mantém tabela própria de medidas + regras + condições,
-- pra não misturar o ciclo de vida de uma coisa com a outra. Espelha 1:1 o motor já validado
-- em dim_bases_calculo / dim_regras_calculo / dim_regra_condicoes (mesmas ações e operadores).

CREATE TABLE IF NOT EXISTS dim_medidas_bi (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte_calculo_id  uuid NOT NULL REFERENCES dim_fontes_calculo(id) ON DELETE RESTRICT,
  nome              text NOT NULL,
  codigo            text NOT NULL UNIQUE,
  descricao         text,
  coluna_valor      text,
  tipo_agregacao    text NOT NULL DEFAULT 'SOMA' CHECK (tipo_agregacao IN ('SOMA', 'CONTAGEM', 'MEDIA')),
  destino_bi        text,          -- slot/dashboard de BI que esta medida alimenta (ex: 'possibilidades.real_pecas_balcao')
  ativo             boolean NOT NULL DEFAULT true,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

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

ALTER TABLE dim_medidas_bi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi;
CREATE POLICY "auth_all" ON dim_medidas_bi FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_medidas_bi_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi_regras;
CREATE POLICY "auth_all" ON dim_medidas_bi_regras FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE dim_medidas_bi_regra_condicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_medidas_bi_regra_condicoes;
CREATE POLICY "auth_all" ON dim_medidas_bi_regra_condicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
