-- Férias calculadas (importadas do arquivo do SharePoint
-- "RH/Férias/Relacao de Ferias Calculadas <ano>.xls"). Compartilhado entre todos os
-- gerentes: quem importar primeiro vale pra todos.
CREATE TABLE IF NOT EXISTS rh_ferias (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_empregado  integer,          -- i_empregados
  nome              text NOT NULL,    -- nome
  inicio_gozo       date,             -- inicio_gozo
  fim_gozo          date,             -- fim_gozo
  codigo_cargo      integer,          -- i_cargos
  nome_cargo        text,             -- sq_nome_cargo
  nome_ccustos      text,             -- sq_nome_ccustos
  cnpj_empresa      text,             -- cgce_emp
  importado_por     text,
  importado_em      timestamptz NOT NULL DEFAULT now(),
  -- Chave natural: mesmo empregado + mesma empresa + mesmo período de gozo = mesmo registro
  UNIQUE (codigo_empregado, cnpj_empresa, inicio_gozo, fim_gozo)
);

-- Log de importações/reprocessamentos — alimenta o aviso "banco já importado por X em Y".
CREATE TABLE IF NOT EXISTS rh_ferias_importacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao           text NOT NULL CHECK (acao IN ('IMPORTAR', 'REPROCESSAR')),
  usuario        text,
  qtd_arquivo    integer NOT NULL DEFAULT 0,
  qtd_novos      integer NOT NULL DEFAULT 0,
  qtd_removidos  integer NOT NULL DEFAULT 0,
  data_hora      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rh_ferias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON rh_ferias;
CREATE POLICY "auth_all" ON rh_ferias FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rh_ferias_importacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON rh_ferias_importacoes;
CREATE POLICY "auth_all" ON rh_ferias_importacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
