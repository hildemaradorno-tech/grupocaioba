-- Flag "Processa Comissões" no cadastro de Empresas: só as marcadas aparecem nas telas de Comissões
-- (DAF / HONDA / Prestadores de Serviços) e no Processamento de Comissões.
ALTER TABLE dim_empresas ADD COLUMN IF NOT EXISTS processa_comissoes boolean NOT NULL DEFAULT false;

-- Já liga as que aparecem hoje nessas telas (ativas, não visuais, dos 3 agrupamentos) — ninguém some.
UPDATE dim_empresas SET processa_comissoes = true
WHERE ativo IS NOT FALSE AND empresa_visual IS NOT TRUE
  AND agrupamento_nome IN ('Caiobá Trucks', 'Caiobá Motos', 'Outras Caiobá');

NOTIFY pgrst, 'reload schema';
