-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Prazo de resposta do Modo Relatório — A Responder.
--  * Ao clicar "Conferido" o usuário define data/hora limite (padrão: amanhã 15:00).
--  * Vencido o prazo, a auditoria muda sozinha para:
--      respondido_total   → todas as OS pendentes com Situação + Observação + Dt. Previsão
--      respondido_parcial → faltou responder alguma OS pendente
--  * O antigo status 'respondido' vira 'respondido_total'.
-- OS pendente = Na Oficina = Não  OU  30+ dias entre criação e auditoria (mesma regra da tela).
-- ============================================================

ALTER TABLE aud_auditorias
  ADD COLUMN IF NOT EXISTS prazo_resposta timestamptz;

ALTER TABLE aud_auditorias DROP CONSTRAINT IF EXISTS aud_auditorias_status_check;
UPDATE aud_auditorias SET status = 'respondido_total' WHERE status = 'respondido';
ALTER TABLE aud_auditorias
  ADD CONSTRAINT aud_auditorias_status_check
  CHECK (status IN ('conferencia', 'a_responder', 'respondido_total', 'respondido_parcial'));

-- Encerra as auditorias com prazo vencido. Retorna quantas foram encerradas.
CREATE OR REPLACE FUNCTION aud_encerrar_prazos()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  WITH vencidas AS (
    SELECT a.id,
           NOT EXISTS (
             SELECT 1 FROM aud_auditoria_os o
              WHERE o.auditoria_id = a.id
                AND (o.na_oficina IS FALSE OR (o.data_auditoria - o.data_criacao) >= 30)
                AND (o.situacao_id IS NULL OR coalesce(trim(o.observacao), '') = '' OR o.data_previsao IS NULL)
           ) AS completa
      FROM aud_auditorias a
     WHERE a.status = 'a_responder'
       AND a.prazo_resposta IS NOT NULL
       AND a.prazo_resposta <= now()
  )
  UPDATE aud_auditorias a
     SET status               = CASE WHEN v.completa THEN 'respondido_total' ELSE 'respondido_parcial' END,
         ultimo_procedimento  = CASE WHEN v.completa THEN 'Respondido Total' ELSE 'Respondido Parcial' END,
         status_atualizado_em = a.prazo_resposta,
         status_atualizado_por = 'Sistema (prazo encerrado)',
         respondido_em        = a.prazo_resposta,
         respondido_por       = 'Sistema (prazo encerrado)'
    FROM vencidas v
   WHERE a.id = v.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION aud_encerrar_prazos() TO authenticated;

-- Roda sozinho a cada 5 minutos (a tela também chama a função ao abrir e ao zerar o contador)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('aud_encerrar_prazos', '*/5 * * * *', 'SELECT aud_encerrar_prazos()');
