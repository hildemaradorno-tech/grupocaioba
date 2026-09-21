-- Auditoria da aprovação de metas: quem aprovou (além de quando) e histórico de eventos (aprovou / pendenciou).

-- 1) Quem aprovou, em cada linha aprovada (usuarios.id + nome no momento da aprovação)
ALTER TABLE public.fato_rascunho_metas_pecas
  ADD COLUMN IF NOT EXISTS aprovado_por uuid, ADD COLUMN IF NOT EXISTS aprovado_por_nome text;
ALTER TABLE public.fato_rascunho_metas_servicos_mecanico
  ADD COLUMN IF NOT EXISTS aprovado_por uuid, ADD COLUMN IF NOT EXISTS aprovado_por_nome text;
ALTER TABLE public.fato_rascunho_metas_servicos_consultor
  ADD COLUMN IF NOT EXISTS aprovado_por uuid, ADD COLUMN IF NOT EXISTS aprovado_por_nome text;

-- 2) O que é espelhado no Power BI também leva quem aprovou e quando
ALTER TABLE public.fato_metas_publicadas
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por_nome text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- 3) Histórico de eventos: só inclui e consulta (sem UPDATE/DELETE pelo sistema)
CREATE TABLE IF NOT EXISTS public.metas_aprovacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  evento text NOT NULL,            -- 'APROVOU' | 'PENDENCIOU'
  tipo text NOT NULL,              -- 'pecas' | 'consultor' | 'mecanico'
  empresa_id uuid,
  empresa_nome text,
  ano integer,
  setor_id uuid,
  setor_nome text,
  usuario_id uuid,
  usuario_nome text,
  linhas integer,
  valor_total numeric
);
ALTER TABLE public.metas_aprovacao_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hist_select" ON public.metas_aprovacao_historico;
DROP POLICY IF EXISTS "hist_insert" ON public.metas_aprovacao_historico;
CREATE POLICY "hist_select" ON public.metas_aprovacao_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "hist_insert" ON public.metas_aprovacao_historico FOR INSERT TO authenticated WITH CHECK (true);

-- 4) Funções de aprovação que gravam quem aprovou (as versões antigas, sem usuário, continuam existindo)
CREATE OR REPLACE FUNCTION public.approve_metas_pecas_empresa(p_empresa_id uuid, p_ano integer, p_usuario_id uuid, p_usuario_nome text)
 RETURNS void LANGUAGE sql SECURITY DEFINER AS $function$
  UPDATE public.fato_rascunho_metas_pecas
  SET meta_aprovada = meta_faturamento, aprovado_em = now(), aprovado_por = p_usuario_id, aprovado_por_nome = p_usuario_nome
  WHERE empresa_id = p_empresa_id AND ano = p_ano AND meta_faturamento > 0;
$function$;

CREATE OR REPLACE FUNCTION public.approve_metas_pecas_setor(p_empresa_id uuid, p_ano integer, p_setor_id uuid, p_usuario_id uuid, p_usuario_nome text)
 RETURNS void LANGUAGE sql SECURITY DEFINER AS $function$
  UPDATE public.fato_rascunho_metas_pecas
  SET meta_aprovada = meta_faturamento, aprovado_em = now(), aprovado_por = p_usuario_id, aprovado_por_nome = p_usuario_nome
  WHERE empresa_id = p_empresa_id AND ano = p_ano AND setor_id = p_setor_id AND meta_faturamento > 0;
$function$;

CREATE OR REPLACE FUNCTION public.approve_metas_mecanico_empresa(p_empresa_id uuid, p_ano integer, p_usuario_id uuid, p_usuario_nome text)
 RETURNS void LANGUAGE sql SECURITY DEFINER AS $function$
  UPDATE public.fato_rascunho_metas_servicos_mecanico
  SET meta_aprovada = meta_faturamento, aprovado_em = now(), aprovado_por = p_usuario_id, aprovado_por_nome = p_usuario_nome
  WHERE empresa_id = p_empresa_id AND ano = p_ano AND meta_faturamento > 0;
$function$;

CREATE OR REPLACE FUNCTION public.approve_metas_consultor_empresa(p_empresa_id uuid, p_ano integer, p_usuario_id uuid, p_usuario_nome text)
 RETURNS void LANGUAGE sql SECURITY DEFINER AS $function$
  UPDATE public.fato_rascunho_metas_servicos_consultor
  SET meta_aprovada = meta_faturamento, aprovado_em = now(), aprovado_por = p_usuario_id, aprovado_por_nome = p_usuario_nome
  WHERE empresa_id = p_empresa_id AND ano = p_ano AND meta_faturamento > 0;
$function$;
