-- Pós-Vendas › Indicadores de Produtividade › aba Análise de Horas — Não cobrado (18/11/2026)
-- ROF101_SERVICOEXECUTADO (Dealer.net, SharePoint "Serviços executados Não Cobrados", 1 arquivo por mês):
-- serviços executados pelo mecânico e não cobrados do cliente. Só Trucks (MicroWork não tem esse relatório).
-- O backend (produtividadeSync.js) grava 1 linha por linha do relatório (repetidas continuam repetidas, como no arquivo).
-- ano/mes = mês do ARQUIVO (a atualização apaga e regrava por ano/mes); data = DataCriacao da O.S.

CREATE TABLE IF NOT EXISTS pv_prod_nao_cobrado (
  id            bigserial PRIMARY KEY,
  ano           int     NOT NULL,
  mes           int     NOT NULL,
  data          date,
  marca         text    NOT NULL DEFAULT 'TRUCKS',
  empresa       text    NOT NULL,              -- dim_empresas.empresa_fantasia
  consultor     text,
  pessoa        text    NOT NULL DEFAULT '',   -- Produtivo (mecânico), maiúsculas
  os            text    NOT NULL,
  tipo_os       text    NOT NULL DEFAULT '',   -- sigla (ex.: V02)
  servico       text,
  horas         numeric NOT NULL DEFAULT 0,
  valor_custo   numeric NOT NULL DEFAULT 0,
  valor_total   numeric NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pv_prod_nao_cobrado_os_idx  ON pv_prod_nao_cobrado (marca, empresa, os);
CREATE INDEX IF NOT EXISTS pv_prod_nao_cobrado_mes_idx ON pv_prod_nao_cobrado (ano, mes);

ALTER TABLE pv_prod_nao_cobrado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "por_modulo_leitura" ON pv_prod_nao_cobrado;
CREATE POLICY "por_modulo_leitura" ON pv_prod_nao_cobrado FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu_like(VARIADIC ARRAY['pos-vendas/'::text])));

-- Função da aba: agora devolve também as horas/valor não cobrados de cada O.S. (histórico inteiro da O.S.).
DROP FUNCTION IF EXISTS pv_prod_enc_fat(date, date);
CREATE FUNCTION pv_prod_enc_fat(p_ini date, p_fim date)
RETURNS TABLE (
  marca text, empresa text, os text, tipo_os text, pessoa text, data date,
  hr_vend_enc numeric, hr_vend_fat numeric, vl_servicos numeric,
  hr_nao_cobrado numeric, vl_nao_cobrado numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH alvo AS (
    SELECT DISTINCT p.marca, p.empresa, p.os
      FROM pv_prod_os p
     WHERE p.papel = 'mecanico' AND p.os <> '' AND p.data BETWEEN p_ini AND p_fim
       AND (p.hr_vend_enc <> 0 OR p.hr_vend_fat <> 0)
  ),
  base AS (
    SELECT p.marca, p.empresa, p.os, p.tipo_os, p.pessoa, p.data,
           p.hr_vend_enc, p.hr_vend_fat, p.vl_servicos, 0::numeric AS hr_nc, 0::numeric AS vl_nc
      FROM pv_prod_os p
      JOIN alvo a ON a.marca = p.marca AND a.empresa = p.empresa AND a.os = p.os
     WHERE p.papel = 'mecanico' AND (p.hr_vend_enc <> 0 OR p.hr_vend_fat <> 0)
    UNION ALL
    SELECT n.marca, n.empresa, n.os, n.tipo_os, n.pessoa, coalesce(n.data, make_date(n.ano, n.mes, 1)),
           0, 0, 0, n.horas, n.valor_total
      FROM pv_prod_nao_cobrado n
      JOIN alvo a ON a.marca = n.marca AND a.empresa = n.empresa AND a.os = n.os
  )
  SELECT marca, empresa, os, max(tipo_os), pessoa, data,
         sum(hr_vend_enc), sum(hr_vend_fat), sum(vl_servicos), sum(hr_nc), sum(vl_nc)
    FROM base
   GROUP BY marca, empresa, os, pessoa, data
$$;

GRANT EXECUTE ON FUNCTION pv_prod_enc_fat(date, date) TO authenticated;
