-- Nem todo relatório MicroWork usa os mesmos nomes de campo pro filtro de período — o backend
-- assumia "Periododeconclusaoinicial"/"Periododeconclusaofinal" pra TODOS, mas relatórios
-- diferentes exigem nomes diferentes (ex: "DataConclusaoInicial"/"DataConclusaoFinal"). Cada
-- Fonte agora escolhe o nome certo; default mantém o comportamento de hoje pras fontes já
-- configuradas com o nome genérico.
ALTER TABLE dim_fontes_microwork ADD COLUMN IF NOT EXISTS campo_periodo_inicio text NOT NULL DEFAULT 'Periododeconclusaoinicial';
ALTER TABLE dim_fontes_microwork ADD COLUMN IF NOT EXISTS campo_periodo_fim text NOT NULL DEFAULT 'Periododeconclusaofinal';

-- Corrige a Fonte "BI_MERCADORIAS - VENDAS DE MERCADORIAS": o campo de período real dela é
-- DataConclusaoInicial/DataConclusaoFinal (visto no filtro colado), não o nome genérico — e o
-- valor fixo (01/09 a 25/09) que ficou preso em Filtros Fixos travava TODO cálculo nesse
-- intervalo, independente do mês escolhido na tela. Remove o valor fixo e configura o campo certo.
UPDATE dim_fontes_microwork
SET
  campo_periodo_inicio = 'DataConclusaoInicial',
  campo_periodo_fim = 'DataConclusaoFinal',
  filtros_fixos = regexp_replace(
    regexp_replace(filtros_fixos, 'DataConclusaoInicial=[^;]*;?', '', 'gi'),
    'DataConclusaoFinal=[^;]*;?', '', 'gi'
  )
WHERE nome = 'BI_MERCADORIAS - VENDAS DE MERCADORIAS';
