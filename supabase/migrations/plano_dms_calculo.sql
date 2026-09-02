-- Categorias que aparecem no export de Chassi x Contrato mas ainda não tinham entrado
-- em Valor Plano DMS (sem valores ainda — o usuário preenche depois pela tela).
INSERT INTO dim_categorias_plano_dms (nome) VALUES ('ÓLEOS E FILTROS PLUS'), ('ULTRA')
ON CONFLICT (nome) DO NOTHING;

-- Tipo de cálculo da política: PADRAO (Fonte+Base, comportamento de sempre) ou PLANO_DMS
-- (valor vem do motor bespoke de Plano DMS, sem Fonte/Base configurados).
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS tipo_calculo text NOT NULL DEFAULT 'PADRAO'
  CHECK (tipo_calculo IN ('PADRAO', 'PLANO_DMS'));
