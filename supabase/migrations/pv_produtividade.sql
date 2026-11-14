-- Pós-Vendas › Indicadores de Produtividade e Eficiência (nov/2026)
-- Reproduz o Power BI "Indicadores de Produtividade e Eficiência - Pós-Vendas - Caiobá".
-- O backend (produtividadeSync.js) lê os relatórios por mês e grava aqui; a tela só lê.
--   Trucks (Dealer.net, SharePoint): ROF096 Fechamento Cartão Produção, ROF036 Cartão Tarefa,
--                                    RELATORIOGERALOS (Relatório Geral OS), ROF042 Vendas Mecânicos
--   Motos (MicroWork, API):         Apontamentos (342), Relatório Geral OS TMO (190), Vendas Serviços TMO (188)
-- 1 linha por dia × empresa × pessoa × papel × O.S. × tipo de O.S. (linhas de disponibilidade têm os = '').

CREATE TABLE IF NOT EXISTS pv_prod_os (
  data          date    NOT NULL,
  marca         text    NOT NULL,              -- TRUCKS | MOTOS
  empresa       text    NOT NULL,              -- dim_empresas.empresa_fantasia
  papel         text    NOT NULL,              -- mecanico | consultor
  pessoa        text    NOT NULL,              -- nome em maiúsculas, sem espaços duplicados
  os            text    NOT NULL DEFAULT '',
  tipo_os       text    NOT NULL DEFAULT '',
  hr_disp       numeric NOT NULL DEFAULT 0,    -- Hr. Disp.           (ROF096 normais | tempodisponivelcentesimal)
  hr_disp_reais numeric NOT NULL DEFAULT 0,    -- Hr. Disp. Reais     (ROF096 disponiveis | temporealcentesimal)
  hr_aplic      numeric NOT NULL DEFAULT 0,    -- Horas Aplicadas (abertura de O.S.)
  hr_vend_enc   numeric NOT NULL DEFAULT 0,    -- Horas Vendidas (tempo encerrado mecânico)
  hr_gasto_enc  numeric NOT NULL DEFAULT 0,    -- Horas Gastas   (tempo encerrado mecânico)
  hr_vend_fat   numeric NOT NULL DEFAULT 0,    -- Horas Vendidas (nota fiscal emitida)
  hr_gasto_fat  numeric NOT NULL DEFAULT 0,    -- Horas Gastas   (nota fiscal emitida)
  vl_servicos   numeric NOT NULL DEFAULT 0,    -- Vlr. Serviços (nota fiscal emitida)
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (data, empresa, papel, pessoa, os, tipo_os)
);
CREATE INDEX IF NOT EXISTS pv_prod_os_data_idx ON pv_prod_os (data);
CREATE INDEX IF NOT EXISTS pv_prod_os_os_idx   ON pv_prod_os (os) WHERE os <> '';

-- Controle de quais meses já foram lidos (e quando).
CREATE TABLE IF NOT EXISTS pv_prod_sync (
  ano           int  NOT NULL,
  mes           int  NOT NULL,
  marca         text NOT NULL,
  linhas        int  NOT NULL DEFAULT 0,
  detalhes      jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ano, mes, marca)
);

-- Visões agregadas que a tela consome (sem O.S. — bem menos linhas).
CREATE OR REPLACE VIEW vw_pv_prod_diario WITH (security_invoker = true) AS
SELECT data, marca, empresa, papel, pessoa,
       sum(hr_disp) hr_disp, sum(hr_disp_reais) hr_disp_reais, sum(hr_aplic) hr_aplic,
       sum(hr_vend_enc) hr_vend_enc, sum(hr_gasto_enc) hr_gasto_enc,
       sum(hr_vend_fat) hr_vend_fat, sum(hr_gasto_fat) hr_gasto_fat, sum(vl_servicos) vl_servicos
  FROM pv_prod_os
 GROUP BY data, marca, empresa, papel, pessoa;

CREATE OR REPLACE VIEW vw_pv_prod_mensal WITH (security_invoker = true) AS
SELECT date_trunc('month', data)::date mes, marca, empresa, papel, pessoa,
       sum(hr_disp) hr_disp, sum(hr_disp_reais) hr_disp_reais, sum(hr_aplic) hr_aplic,
       sum(hr_vend_enc) hr_vend_enc, sum(hr_gasto_enc) hr_gasto_enc,
       sum(hr_vend_fat) hr_vend_fat, sum(hr_gasto_fat) hr_gasto_fat, sum(vl_servicos) vl_servicos
  FROM pv_prod_os
 GROUP BY 1, marca, empresa, papel, pessoa;

-- Leitura só para quem tem o menu; gravação só pelo backend (service role ignora RLS).
ALTER TABLE pv_prod_os   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_prod_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo_leitura" ON pv_prod_os;
DROP POLICY IF EXISTS "por_modulo_leitura" ON pv_prod_sync;
CREATE POLICY "por_modulo_leitura" ON pv_prod_os FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['pos-vendas/'::text])));
CREATE POLICY "por_modulo_leitura" ON pv_prod_sync FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['pos-vendas/'::text])));
GRANT SELECT ON vw_pv_prod_diario, vw_pv_prod_mensal TO authenticated;
