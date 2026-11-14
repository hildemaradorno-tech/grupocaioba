-- Pós-Vendas › Indicadores de Produtividade — histórico por mecânico até o TMO (12/11/2026).
-- pv_prod_os passa a ter 1 linha por dia × empresa × papel × pessoa × O.S. × tipo × TMO.
-- As views vw_pv_prod_diario / vw_pv_prod_mensal não mudam (somam sem O.S./TMO).
ALTER TABLE pv_prod_os ADD COLUMN IF NOT EXISTS tmo text NOT NULL DEFAULT '';

ALTER TABLE pv_prod_os DROP CONSTRAINT IF EXISTS pv_prod_os_pkey;
ALTER TABLE pv_prod_os ADD CONSTRAINT pv_prod_os_pkey PRIMARY KEY (data, empresa, papel, pessoa, os, tipo_os, tmo);

-- Histórico de um mecânico no período (janela da aba Mecânicos).
CREATE INDEX IF NOT EXISTS pv_prod_os_pessoa_idx ON pv_prod_os (pessoa, data);
