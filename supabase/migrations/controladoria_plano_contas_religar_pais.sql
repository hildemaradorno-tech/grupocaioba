-- Correção: a 1ª importação do Plano de Contas (Dealer.net) gravou quase todas as contas sem conta pai
-- (bug no cálculo do nível na importação, já corrigido). Religa cada conta ao ancestral mais próximo
-- pelo código, na mesma empresa: 1.1.1.01.01.001 → 1.1.1.01.01 → 1.1.1.01 → ... (prefere Sintética).
-- Só empresas Dealer.net (código por prefixo de segmentos).
WITH seg AS (
  SELECT c.id, c.empresa_id, string_to_array(c.codigo, '.') AS s
  FROM ctb_plano_contas c
  JOIN dim_empresas e ON e.id = c.empresa_id
  WHERE e.sistema_dms = 'Dealer.net'
),
cand AS (
  SELECT s1.id, p.id AS pai_id,
         row_number() OVER (PARTITION BY s1.id ORDER BY k DESC, (p.tipo = 'SINTETICA') DESC) AS rn
  FROM seg s1
  CROSS JOIN LATERAL generate_series(1, array_length(s1.s, 1) - 1) AS k
  JOIN ctb_plano_contas p ON p.empresa_id = s1.empresa_id AND p.codigo = array_to_string(s1.s[1:k], '.')
)
UPDATE ctb_plano_contas c
SET conta_pai_id = cand.pai_id
FROM cand
WHERE cand.id = c.id AND cand.rn = 1 AND c.conta_pai_id IS DISTINCT FROM cand.pai_id;
