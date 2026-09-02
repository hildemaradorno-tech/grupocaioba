-- departamento_ids/setor_ids em dim_funcionarios são um SNAPSHOT copiado do Cargo no momento em
-- que o funcionário foi salvo pela tela (Editar Funcionário) — não são recalculados sozinhos
-- quando o vínculo Departamento/Setor do Cargo muda depois (em /cargos). Resincroniza todo mundo
-- que tem cargo_id com o vínculo ATUAL do cargo, sem precisar reabrir/resalvar cada funcionário.
UPDATE dim_funcionarios f
SET departamento_ids = COALESCE((
  SELECT jsonb_agg(DISTINCT to_jsonb(r.departamento_id))
  FROM rel_cargos_departamentos r
  WHERE r.cargo_id = f.cargo_id
), '[]'::jsonb),
setor_ids = COALESCE((
  SELECT jsonb_agg(DISTINCT to_jsonb(r.setor_id))
  FROM rel_cargos_setores r
  WHERE r.cargo_id = f.cargo_id
), '[]'::jsonb)
WHERE f.cargo_id IS NOT NULL;
