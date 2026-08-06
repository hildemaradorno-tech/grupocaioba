-- ============================================================
-- TABELA: fato_calendario
-- Motor de dias úteis para Power BI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fato_calendario (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID        NOT NULL REFERENCES public.dim_empresas(id) ON DELETE RESTRICT,
  empresa_nome      TEXT,
  data              DATE        NOT NULL,
  ano               INTEGER     NOT NULL,
  mes               INTEGER     NOT NULL,
  dia_semana        TEXT,
  descricao_evento  TEXT,
  tipo_pausa        TEXT,
  dias_uteis        NUMERIC(4,2) NOT NULL DEFAULT 0,
  dias_total_mes    NUMERIC(6,2) NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Garante unicidade: 1 registro por empresa/dia
  CONSTRAINT uq_fato_calendario_empresa_data UNIQUE (empresa_id, data)
);

-- Índices para queries do Power BI e da tela de filtro
CREATE INDEX IF NOT EXISTS idx_fato_cal_empresa_ano
  ON public.fato_calendario (empresa_id, ano);

CREATE INDEX IF NOT EXISTS idx_fato_cal_data
  ON public.fato_calendario (data);

CREATE INDEX IF NOT EXISTS idx_fato_cal_mes
  ON public.fato_calendario (empresa_id, ano, mes);

-- RLS desabilitado (ambiente de desenvolvimento local)
ALTER TABLE public.fato_calendario DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- STORED PROCEDURE: gerar_calendario_anual
-- Gera ou regenera os 365 dias do ano para uma empresa
-- Uso: SELECT gerar_calendario_anual('uuid-empresa', 2025);
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_calendario_anual(
  p_empresa_id  UUID,
  p_ano         INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_nome TEXT;
BEGIN
  -- Busca nome da empresa para desnormalizar
  SELECT COALESCE(empresa_fantasia, nome_empresa)
    INTO v_empresa_nome
    FROM public.dim_empresas
   WHERE id = p_empresa_id;

  -- Remove registros existentes do ano (permite reprocessar)
  DELETE FROM public.fato_calendario
   WHERE empresa_id = p_empresa_id
     AND ano = p_ano;

  -- Insere os dias com cálculo de dias_uteis e dias_total_mes
  INSERT INTO public.fato_calendario (
    empresa_id, empresa_nome,
    data, ano, mes, dia_semana,
    descricao_evento, tipo_pausa,
    dias_uteis, dias_total_mes
  )
  SELECT
    p_empresa_id,
    v_empresa_nome,
    base.data,
    p_ano,
    EXTRACT(MONTH FROM base.data)::INTEGER AS mes,
    -- Dia da semana em português
    CASE EXTRACT(ISODOW FROM base.data)
      WHEN 1 THEN 'Segunda-feira'
      WHEN 2 THEN 'Terça-feira'
      WHEN 3 THEN 'Quarta-feira'
      WHEN 4 THEN 'Quinta-feira'
      WHEN 5 THEN 'Sexta-feira'
      WHEN 6 THEN 'Sábado'
      WHEN 7 THEN 'Domingo'
    END AS dia_semana,
    -- Descrição e tipo_pausa vindos de dim_calendario_feriados
    fer.descricao  AS descricao_evento,
    fer.tipo_pausa AS tipo_pausa,
    -- Cálculo de dias_uteis
    CASE
      WHEN fer.tipo_pausa IN ('FERIADO', 'PARADA TOTAL')  THEN 0.00
      WHEN fer.tipo_pausa = 'PARADA PARCIAL'              THEN 0.50
      WHEN EXTRACT(ISODOW FROM base.data) = 6            THEN 0.50  -- Sábado
      WHEN EXTRACT(ISODOW FROM base.data) = 7            THEN 0.00  -- Domingo
      ELSE 1.00
    END AS dias_uteis,
    -- dias_total_mes: soma acumulada corrida de dias_uteis no mês
    -- Calculado como window function na subquery abaixo
    0.00 AS dias_total_mes  -- placeholder; atualizado na etapa seguinte

  FROM (
    SELECT generate_series(
      DATE_TRUNC('year', MAKE_DATE(p_ano, 1, 1)),
      DATE_TRUNC('year', MAKE_DATE(p_ano, 1, 1)) + INTERVAL '1 year' - INTERVAL '1 day',
      INTERVAL '1 day'
    )::DATE AS data
  ) base
  LEFT JOIN public.dim_calendario_feriados fer
    ON fer.data_feriado = base.data
   AND fer.empresa_id   = p_empresa_id;

  -- Segunda passagem: atualiza dias_total_mes com soma acumulada real
  UPDATE public.fato_calendario fc
     SET dias_total_mes  = calc.acumulado,
         atualizado_em   = now()
    FROM (
      SELECT
        id,
        SUM(dias_uteis) OVER (
          PARTITION BY empresa_id, ano, mes
          ORDER BY data
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS acumulado
      FROM public.fato_calendario
      WHERE empresa_id = p_empresa_id
        AND ano        = p_ano
    ) calc
   WHERE fc.id = calc.id;
END;
$$;
