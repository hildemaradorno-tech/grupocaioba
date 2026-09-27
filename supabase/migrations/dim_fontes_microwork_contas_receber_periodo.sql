-- Mesmo problema já corrigido antes pra BI_MERCADORIAS: o campo de período real desta Fonte é
-- Datademovimentacaoinicial/Datademovimentacaofinal (não o nome genérico), e um valor fixo
-- (01/09 a 27/09) tinha ficado preso em Filtros Fixos, travando todo cálculo nesse intervalo
-- independente do mês escolhido na tela. Remove o valor fixo e configura o campo certo.
UPDATE dim_fontes_microwork
SET
  campo_periodo_inicio = 'Datademovimentacaoinicial',
  campo_periodo_fim = 'Datademovimentacaofinal',
  filtros_fixos = regexp_replace(
    regexp_replace(filtros_fixos, 'Datademovimentacaoinicial=[^;]*;?', '', 'gi'),
    'Datademovimentacaofinal=[^;]*;?', '', 'gi'
  )
WHERE nome = 'API - COMISSOES_CONTAS A RECEBER';
