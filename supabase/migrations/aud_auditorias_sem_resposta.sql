-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Novo status ao vencer o prazo: 'sem_resposta' — nenhuma OS pendente foi respondida.
--   respondido_total   → todas as pendentes respondidas (ou não havia pendentes)
--   respondido_parcial → algumas respondidas
--   sem_resposta       → nenhuma respondida
-- Respondida = Situação + Observação + Dt. Previsão preenchidas.
-- ============================================================

ALTER TABLE aud_auditorias DROP CONSTRAINT IF EXISTS aud_auditorias_status_check;
ALTER TABLE aud_auditorias
  ADD CONSTRAINT aud_auditorias_status_check
  CHECK (status IN ('conferencia', 'a_responder', 'respondido_total', 'respondido_parcial', 'sem_resposta'));

CREATE OR REPLACE FUNCTION aud_encerrar_prazos()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  WITH contagem AS (
    SELECT a.id,
           count(o.id) FILTER (WHERE o.na_oficina IS FALSE OR (o.data_auditoria - o.data_criacao) >= 30) AS pendentes,
           count(o.id) FILTER (WHERE (o.na_oficina IS FALSE OR (o.data_auditoria - o.data_criacao) >= 30)
                                 AND o.situacao_id IS NOT NULL
                                 AND coalesce(trim(o.observacao), '') <> ''
                                 AND o.data_previsao IS NOT NULL) AS respondidas
      FROM aud_auditorias a
      LEFT JOIN aud_auditoria_os o ON o.auditoria_id = a.id
     WHERE a.status = 'a_responder'
       AND a.prazo_resposta IS NOT NULL
       AND a.prazo_resposta <= now()
     GROUP BY a.id
  ), destino AS (
    SELECT id,
           CASE WHEN respondidas = pendentes THEN 'respondido_total'
                WHEN respondidas = 0          THEN 'sem_resposta'
                ELSE 'respondido_parcial' END AS novo
      FROM contagem
  )
  UPDATE aud_auditorias a
     SET status               = d.novo,
         ultimo_procedimento  = CASE d.novo WHEN 'respondido_total' THEN 'Respondido Total'
                                            WHEN 'sem_resposta'     THEN 'Sem Resposta'
                                            ELSE 'Respondido Parcial' END,
         status_atualizado_em = a.prazo_resposta,
         status_atualizado_por = 'Sistema (prazo encerrado)',
         respondido_em        = a.prazo_resposta,
         respondido_por       = 'Sistema (prazo encerrado)'
    FROM destino d
   WHERE a.id = d.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

NOTIFY pgrst, 'reload schema';
