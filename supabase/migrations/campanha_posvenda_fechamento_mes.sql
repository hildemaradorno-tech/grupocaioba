-- ============================================================
-- Campanha Pós-Venda — Fechar mês (por empresa)
-- fato_campanha_fechamento (já existia, sem uso) passa a guardar a "foto" do mês fechado de cada
-- empresa (periodo = 'MES'): participantes, semanas e valores da Matriz KPIs de cada função, além
-- das regras. Com o mês fechado, Apuração/Resultado/Pagamento mostram só a foto (não recalculam) e
-- as regras daquele mês/empresa não podem ser gravadas (trava no banco, abaixo).
-- Reabrir não apaga a linha: status = 'reaberto' + quem/quando (histórico do último fechamento).
-- ============================================================
ALTER TABLE fato_campanha_fechamento ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'fechado';
ALTER TABLE fato_campanha_fechamento DROP CONSTRAINT IF EXISTS fato_campanha_fechamento_status_check;
ALTER TABLE fato_campanha_fechamento ADD CONSTRAINT fato_campanha_fechamento_status_check CHECK (status IN ('fechado', 'reaberto'));
ALTER TABLE fato_campanha_fechamento ADD COLUMN IF NOT EXISTS reaberto_em timestamptz;
ALTER TABLE fato_campanha_fechamento ADD COLUMN IF NOT EXISTS reaberto_por text;

-- Regras de um mês fechado não mudam (vale para Salvar, Zerar, Copiar do mês anterior, Copiar para
-- todas as empresas e Copiar para os próximos meses).
CREATE OR REPLACE FUNCTION campanha_bloqueia_regras_mes_fechado() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_ano smallint;
  v_mes smallint;
  v_unidade text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ano := OLD.ano; v_mes := OLD.mes; v_unidade := OLD.unidade;
  ELSE
    v_ano := NEW.ano; v_mes := NEW.mes; v_unidade := NEW.unidade;
  END IF;
  IF EXISTS (
    SELECT 1 FROM fato_campanha_fechamento f
     WHERE f.ano = v_ano AND f.mes = v_mes AND f.unidade = v_unidade
       AND f.periodo = 'MES' AND f.status = 'fechado'
  ) THEN
    RAISE EXCEPTION 'Mês fechado: as regras de %/% (%) não podem ser alteradas. Reabra o mês para editar.', v_mes, v_ano, v_unidade;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_campanha_regras_mes_fechado ON fato_campanha_regras;
CREATE TRIGGER trg_campanha_regras_mes_fechado
  BEFORE INSERT OR UPDATE OR DELETE ON fato_campanha_regras
  FOR EACH ROW EXECUTE FUNCTION campanha_bloqueia_regras_mes_fechado();
