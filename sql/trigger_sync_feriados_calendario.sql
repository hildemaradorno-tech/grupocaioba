-- ============================================================
-- TRIGGER: Sincroniza dim_calendario_feriados -> fato_calendario
-- Toda inclusão, edição ou exclusão de feriado reflete
-- automaticamente nas linhas já geradas do calendário.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_feriado_to_calendario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id  UUID;
  v_data        DATE;
  v_dia_semana  TEXT;
  v_ano         INTEGER;
  v_mes         INTEGER;
  v_dias_uteis  NUMERIC(4,2);
BEGIN
  -- Define qual empresa/data foi afetada
  IF TG_OP = 'DELETE' THEN
    v_empresa_id := OLD.empresa_id;
    v_data       := OLD.data_feriado;
  ELSE
    v_empresa_id := NEW.empresa_id;
    v_data       := NEW.data_feriado;
  END IF;

  v_ano := EXTRACT(YEAR  FROM v_data)::INTEGER;
  v_mes := EXTRACT(MONTH FROM v_data)::INTEGER;

  -- Busca o dia da semana já gravado no calendário
  SELECT dia_semana INTO v_dia_semana
    FROM public.fato_calendario
   WHERE empresa_id = v_empresa_id
     AND data       = v_data;

  -- Se o calendário deste ano/empresa ainda não foi gerado, encerra sem erro
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calcula o novo valor de dias_uteis
  IF TG_OP = 'DELETE' THEN
    -- Sem feriado: recalcula apenas pelo dia da semana
    v_dias_uteis := CASE
      WHEN v_dia_semana = 'Sábado'  THEN 0.50
      WHEN v_dia_semana = 'Domingo' THEN 0.00
      ELSE 1.00
    END;

    UPDATE public.fato_calendario
       SET descricao_evento = NULL,
           tipo_pausa       = NULL,
           dias_uteis       = v_dias_uteis,
           atualizado_em    = now()
     WHERE empresa_id = v_empresa_id
       AND data       = v_data;

  ELSE
    -- INSERT ou UPDATE: aplica regras do feriado
    v_dias_uteis := CASE
      WHEN NEW.tipo_pausa IN ('FERIADO', 'PARADA TOTAL') THEN 0.00
      WHEN NEW.tipo_pausa = 'PARADA PARCIAL'             THEN 0.50
      WHEN v_dia_semana = 'Sábado'                       THEN 0.50
      WHEN v_dia_semana = 'Domingo'                      THEN 0.00
      ELSE 1.00
    END;

    UPDATE public.fato_calendario
       SET descricao_evento = NEW.descricao,
           tipo_pausa       = NEW.tipo_pausa,
           dias_uteis       = v_dias_uteis,
           atualizado_em    = now()
     WHERE empresa_id = v_empresa_id
       AND data       = v_data;
  END IF;

  -- Recalcula dias_total_mes (soma acumulada corrida) para o mês afetado
  UPDATE public.fato_calendario fc
     SET dias_total_mes = calc.acumulado,
         atualizado_em  = now()
    FROM (
      SELECT
        id,
        SUM(dias_uteis) OVER (
          PARTITION BY empresa_id, ano, mes
          ORDER BY data
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS acumulado
      FROM public.fato_calendario
      WHERE empresa_id = v_empresa_id
        AND ano        = v_ano
        AND mes        = v_mes
    ) calc
   WHERE fc.id = calc.id;

  RETURN NULL;
END;
$$;

-- Remove trigger anterior se existir (permite re-executar o script)
DROP TRIGGER IF EXISTS trg_sync_feriado_to_calendario
  ON public.dim_calendario_feriados;

-- Cria o trigger: dispara APÓS qualquer INSERT, UPDATE ou DELETE em feriados
CREATE TRIGGER trg_sync_feriado_to_calendario
  AFTER INSERT OR UPDATE OR DELETE
  ON public.dim_calendario_feriados
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_feriado_to_calendario();
