-- pv_prod_enc_fat mais rápida (19/11/2026, achado pelo Monitor Supabase: média 0,9 s, 135 execuções).
-- Única mudança: `AND p.os <> ''` no bloco `base`. Não altera o resultado (o `alvo` já só tem O.S. preenchida e o
-- join exige a mesma O.S.), mas permite ao banco usar o índice pv_prod_os_os_idx (WHERE os <> '') em vez de ler
-- as ~72 mil linhas de mecânico. EXPLAIN ANALYZE (out/2026): 0,9–4,5 s → ~0,04 s.
CREATE OR REPLACE FUNCTION public.pv_prod_enc_fat(p_ini date, p_fim date)
 RETURNS TABLE(marca text, empresa text, os text, tipo_os text, pessoa text, data date, hr_vend_enc numeric, hr_vend_fat numeric, vl_servicos numeric, hr_nao_cobrado numeric, vl_nao_cobrado numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
     WHERE p.papel = 'mecanico' AND p.os <> '' AND (p.hr_vend_enc <> 0 OR p.hr_vend_fat <> 0)
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
$function$;
