-- Documentos PJ (menu Documentos PJ, permissão 'documentos-pj'): documentos que o prestador PJ envia todo
-- mês. escopo 'TODOS' = todo prestador PJ; 'REGRA' = só quem tem a Regra PJ (regra_id = grupo_politica_id)
-- calculada no mês. Obrigatório: sem o anexo, o Conferir Comissões de Prestadores de Serviços trava.
-- Substitui fato_politica_comissao.pj_documentos (os documentos que estavam nas regras vêm pra cá).
CREATE TABLE IF NOT EXISTS pj_documentos_exigidos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  obrigatorio  boolean NOT NULL DEFAULT true,
  escopo       text NOT NULL DEFAULT 'TODOS' CHECK (escopo IN ('TODOS', 'REGRA')),
  regra_id     uuid,
  vig_inicio   date,
  vig_fim      date,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  CHECK (escopo = 'TODOS' OR regra_id IS NOT NULL)
);
ALTER TABLE pj_documentos_exigidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON pj_documentos_exigidos;
DROP POLICY IF EXISTS escrita_por_menu ON pj_documentos_exigidos;
CREATE POLICY sel_auth ON pj_documentos_exigidos FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON pj_documentos_exigidos FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['documentos-pj', 'regras-pj'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['documentos-pj', 'regras-pj'])));

-- Anexo ligado ao documento exigido.
ALTER TABLE pj_anexos ADD COLUMN IF NOT EXISTS documento_id uuid REFERENCES pj_documentos_exigidos(id) ON DELETE SET NULL;

-- Documentos que estavam dentro das Regras PJ (pj_documentos) viram documentos de escopo REGRA.
INSERT INTO pj_documentos_exigidos (nome, obrigatorio, escopo, regra_id)
SELECT DISTINCT d.nome, true, 'REGRA', coalesce(p.grupo_politica_id, p.id)
FROM fato_politica_comissao p
CROSS JOIN LATERAL jsonb_array_elements_text(p.pj_documentos) AS d(nome)
WHERE jsonb_typeof(p.pj_documentos) = 'array'
  AND NOT EXISTS (SELECT 1 FROM pj_documentos_exigidos e WHERE e.escopo = 'REGRA' AND e.regra_id = coalesce(p.grupo_politica_id, p.id) AND e.nome = d.nome);

UPDATE pj_anexos a SET documento_id = e.id
FROM pj_documentos_exigidos e
WHERE a.tipo = 'DOCUMENTO' AND a.documento_id IS NULL AND e.escopo = 'REGRA' AND e.regra_id = a.regra_id AND e.nome = a.documento;

UPDATE fato_politica_comissao SET pj_documentos = NULL WHERE pj_documentos IS NOT NULL;

-- Documentos de todos os prestadores PJ.
INSERT INTO pj_documentos_exigidos (nome, obrigatorio, escopo)
SELECT v.nome, true, 'TODOS' FROM (VALUES ('DARF INSS'), ('Comprovante de pagamento do DARF INSS')) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM pj_documentos_exigidos e WHERE e.escopo = 'TODOS' AND e.nome = v.nome);

NOTIFY pgrst, 'reload schema';
