-- Remove os nós duplicados criados pela importação de Excel de 24/09/2026 (13:56 UTC). A
-- paginação da tela (order by ordem, sem desempate) devolvia linhas repetidas/faltando, então o
-- plano de importação achou que botões e menus que já existiam faltavam e criou de novo.
-- Regra: entre nós irmãos (mesmo pai e mesmo nome), fica o mais antigo (em empate, o de menor
-- id) e os demais são apagados — só se tiverem sido criados nessa importação. Os filhos de um
-- duplicado apagado saem junto (ON DELETE CASCADE); o nó mantido conserva os seus.
DELETE FROM governanca_menus m
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY sistema, COALESCE(pai_id::text, 'raiz'), lower(btrim(nome))
           ORDER BY criado_em, id
         ) AS pos
  FROM governanca_menus
  WHERE sistema = 'Dealer.net'
) d
WHERE m.id = d.id
  AND d.pos > 1
  AND m.criado_em >= '2026-09-24 13:56:00+00'
  AND m.criado_em <  '2026-09-24 13:57:00+00';
