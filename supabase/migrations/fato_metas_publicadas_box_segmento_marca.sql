-- fato_metas_publicadas (espelhada no Power BI): passa a gravar também o Box, o Segmento e a Marca.
-- Segmento e Marca vêm do cadastro da empresa (dim_empresas); o Box, da posição atual do funcionário.
ALTER TABLE public.fato_metas_publicadas
  ADD COLUMN IF NOT EXISTS box_id uuid,
  ADD COLUMN IF NOT EXISTS box_nome text,
  ADD COLUMN IF NOT EXISTS segmento_nome text,
  ADD COLUMN IF NOT EXISTS marca text;

-- Preenche Segmento e Marca do que já está publicado (o Box só entra a partir da próxima aprovação).
UPDATE public.fato_metas_publicadas p
SET segmento_nome = e.segmento_nome,
    marca         = e.marca
FROM public.dim_empresas e
WHERE e.id = p.empresa_id
  AND (p.segmento_nome IS NULL OR p.marca IS NULL);
