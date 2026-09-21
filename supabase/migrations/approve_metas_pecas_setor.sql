-- Aprovação de Metas - Peças por SETOR (Gestão de Aprovação passou a aprovar por setor, como as telas
-- de Serviços mostram a situação). Mesma regra de approve_metas_pecas_empresa, restrita ao setor.
CREATE OR REPLACE FUNCTION public.approve_metas_pecas_setor(p_empresa_id uuid, p_ano integer, p_setor_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  UPDATE public.fato_rascunho_metas_pecas
  SET meta_aprovada = meta_faturamento,
      aprovado_em   = now()
  WHERE empresa_id = p_empresa_id
    AND ano        = p_ano
    AND setor_id   = p_setor_id
    AND meta_faturamento > 0;
$function$;
