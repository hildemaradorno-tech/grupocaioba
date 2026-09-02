-- Permite que um Painel de BI alimente diretamente uma célula da tabela de Faturamento já
-- existente em /bi/possibilidades (Departamentos x Meta/Real/Margem/Pass/Ticket), em vez de
-- só aparecer como um card avulso — reaproveita a tabela/gauges já prontos e bonitos, no lugar
-- de criar uma grade de widgets nova. Quando slot_faturamento é null, o Painel continua
-- aparecendo como card avulso (comportamento anterior, mantido pra casos sem linha pronta).
ALTER TABLE dim_bi_paineis ADD COLUMN IF NOT EXISTS slot_faturamento text
  CHECK (slot_faturamento IN (
    'balcao.realPecas', 'balcao.realServicos',
    'funilaria.realPecas', 'funilaria.realServicos',
    'mecanica.realPecas', 'mecanica.realServicos'
  ));
