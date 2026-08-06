-- Adiciona FORCAR_NEGATIVO / FORCAR_POSITIVO ao motor de Regras de Cálculo.
-- Diferente de INVERTER_SINAL (que multiplica por -1, trocando o sinal do que já está lá),
-- FORCAR_NEGATIVO/FORCAR_POSITIVO ignoram o sinal original e sempre fixam negativo/positivo —
-- necessário pra casos como "se NaturezaOperacao contém DVE, o valor sempre entra negativo",
-- independente de como a coluna de origem representa o sinal.

ALTER TABLE dim_regras_calculo DROP CONSTRAINT IF EXISTS dim_regras_calculo_tipo_acao_check;
ALTER TABLE dim_regras_calculo ADD CONSTRAINT dim_regras_calculo_tipo_acao_check CHECK (tipo_acao IN (
  'FILTRAR', 'DEFINIR_VALOR', 'INVERTER_SINAL', 'FORCAR_NEGATIVO', 'FORCAR_POSITIVO',
  'SOMAR_COLUNA', 'SUBTRAIR_COLUNA', 'MULTIPLICAR_COLUNA', 'DIVIDIR_COLUNA'
));
