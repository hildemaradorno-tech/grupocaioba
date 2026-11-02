-- Prestador PJ (cadastro do Funcionário → aba PJ): forma de emissão das Notas Fiscais.
-- { modo: 'RATEADA' | 'UNICA' | 'AGRUPAMENTO', empresa_id, por_agrupamento: { [agrupamento]: empresa_id } }
ALTER TABLE dim_funcionarios ADD COLUMN IF NOT EXISTS pj_emissao_nf jsonb;

NOTIFY pgrst, 'reload schema';
