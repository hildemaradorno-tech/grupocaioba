-- Módulo TruckPag — Conciliação de Contas a Receber
-- truckpag_titulos e truckpag_creditos_nao_identificados são snapshots (substituídos
-- por completo a cada importação); truckpag_repasses é histórico cumulativo (upsert).

CREATE TABLE IF NOT EXISTS truckpag_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_codigo bigint NOT NULL UNIQUE,
  titulo_numero text,
  titulo_parcela int,
  titulo_empresa_cod int,
  titulo_empresa_nome text,
  titulo_os_numero text,
  titulo_pessoa_nome text,
  titulo_pessoa_doc_ident text,
  titulo_data_emissao date,
  titulo_data_venc date,
  titulo_dias_atraso int,
  titulo_saldo numeric(14,2),
  titulo_valor numeric(14,2),
  tipo_titulo_descr text,
  departamento_sigla text,
  titulo_vendedor_nome text,
  is_vencido boolean,
  importado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truckpag_titulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_titulos;
CREATE POLICY "auth_all" ON truckpag_titulos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS truckpag_creditos_nao_identificados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tesouraria_codigo bigint NOT NULL UNIQUE,
  empresa_desc text,
  conta_gerencial_desc text,
  data_caixa date,
  observacao text,
  nro_documento text,
  valor numeric(14,2),
  importado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE truckpag_creditos_nao_identificados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_creditos_nao_identificados;
CREATE POLICY "auth_all" ON truckpag_creditos_nao_identificados FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS truckpag_repasses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento text,
  data_pagamento date,
  nf_e text,
  nfs_e text,
  numero_os text,
  numero_lote text,
  parcelas text,
  cnpj_cliente text,
  nome_cliente text,
  valor_os numeric(14,2),
  valor_nf_e numeric(14,2),
  valor_parcela_total numeric(14,2),
  taxa_adm_pct numeric(5,2),
  valor_taxa numeric(14,2),
  valor_recebido numeric(14,2),
  importado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_lote, nf_e, data_pagamento)
);

ALTER TABLE truckpag_repasses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON truckpag_repasses;
CREATE POLICY "auth_all" ON truckpag_repasses FOR ALL TO authenticated USING (true) WITH CHECK (true);
