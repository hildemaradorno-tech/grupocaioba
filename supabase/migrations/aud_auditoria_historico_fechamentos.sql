-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- O histórico de reaberturas passa a registrar também os FECHAMENTOS, para a linha do tempo:
--   Fechada (Respondido Total/Parcial/Sem Resposta) por X em … → Reaberta por Y em … → Fechada …
--   tipo      = 'fechamento' | 'reabertura'
--   resultado = status gravado no fechamento (respondido_total | respondido_parcial | sem_resposta)
--   reaberto_por / reaberto_em = quem e quando (vale para os dois tipos)
-- ============================================================

ALTER TABLE aud_auditoria_reaberturas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'reabertura'
    CHECK (tipo IN ('fechamento', 'reabertura')),
  ADD COLUMN IF NOT EXISTS resultado text;

-- Fechamento atual das auditorias já encerradas (se ainda não registrado)
INSERT INTO aud_auditoria_reaberturas (auditoria_id, tipo, resultado, reaberto_por, reaberto_em, por_admin)
SELECT a.id, 'fechamento', a.status, a.respondido_por, a.respondido_em, false
  FROM aud_auditorias a
 WHERE a.status IN ('respondido_total', 'respondido_parcial', 'sem_resposta')
   AND a.respondido_em IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM aud_auditoria_reaberturas r
                    WHERE r.auditoria_id = a.id AND r.tipo = 'fechamento' AND r.reaberto_em = a.respondido_em);

-- Encerramento por prazo agora também grava o fechamento no histórico
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
  ), atualizadas AS (
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
     WHERE a.id = d.id
    RETURNING a.id, a.status, a.prazo_resposta
  )
  INSERT INTO aud_auditoria_reaberturas (auditoria_id, tipo, resultado, reaberto_por, reaberto_em, por_admin)
  SELECT id, 'fechamento', status, 'Sistema (prazo encerrado)', prazo_resposta, false
    FROM atualizadas;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

NOTIFY pgrst, 'reload schema';
