-- Move o "Slot no Faturamento" de dim_bi_paineis pra direto em dim_medidas_bi — mais simples:
-- ao cadastrar a Medida você já escolhe em qual célula da tabela de Faturamento (BI —
-- Possibilidades) o valor total dela aparece, sem precisar passar por BI — Painéis no meio.
-- BI — Painéis continua existindo só pra widgets avulsos (com corte por dimensão).
ALTER TABLE dim_medidas_bi ADD COLUMN IF NOT EXISTS slot_faturamento text
  CHECK (slot_faturamento IN (
    'balcao.realPecas', 'balcao.realServicos',
    'funilaria.realPecas', 'funilaria.realServicos',
    'mecanica.realPecas', 'mecanica.realServicos'
  ));

ALTER TABLE dim_bi_paineis DROP COLUMN IF EXISTS slot_faturamento;
