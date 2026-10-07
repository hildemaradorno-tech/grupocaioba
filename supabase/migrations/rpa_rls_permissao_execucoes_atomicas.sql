-- ============================================================
-- MÓDULO: Agendamento de Processos (RPA / Power BI / Fabric)
-- 1) Fecha o acesso direto via API: só admin ou grupo com permissão para
--    a tela rpa/agendamentos lê/grava em rpa_*. Antes, a política "auth_all"
--    liberava qualquer usuário logado, mesmo sem o menu liberado.
-- 2) Função rpa_salvar_execucoes: substitui as execuções de uma rotina em
--    uma única transação (antes: delete + insert separados no front — se o
--    insert falhasse, a rotina ficava sem horários).
-- Executar no Supabase SQL Editor
-- ============================================================

-- Compara por e-mail (mesmo padrão de audext_tem_acesso)
CREATE OR REPLACE FUNCTION rpa_tem_acesso()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    JOIN grupos_acesso g ON g.id = u.grupo_id
    WHERE u.email = (auth.jwt() ->> 'email') AND u.ativo = true AND g.is_admin = true
  )
  OR EXISTS (
    SELECT 1
    FROM usuarios u
    JOIN permissoes_grupo pg ON pg.grupo_id = u.grupo_id
    WHERE u.email = (auth.jwt() ->> 'email') AND u.ativo = true
      AND pg.menu_path = 'rpa/agendamentos'
  );
$$;

DROP POLICY IF EXISTS "auth_all" ON rpa_processos;
DROP POLICY IF EXISTS "rpa_acesso_modulo" ON rpa_processos;
CREATE POLICY "rpa_acesso_modulo" ON rpa_processos
  FOR ALL TO authenticated USING (rpa_tem_acesso()) WITH CHECK (rpa_tem_acesso());

DROP POLICY IF EXISTS "auth_all" ON rpa_rotinas;
DROP POLICY IF EXISTS "rpa_acesso_modulo" ON rpa_rotinas;
CREATE POLICY "rpa_acesso_modulo" ON rpa_rotinas
  FOR ALL TO authenticated USING (rpa_tem_acesso()) WITH CHECK (rpa_tem_acesso());

DROP POLICY IF EXISTS "auth_all" ON rpa_rotina_execucoes;
DROP POLICY IF EXISTS "rpa_acesso_modulo" ON rpa_rotina_execucoes;
CREATE POLICY "rpa_acesso_modulo" ON rpa_rotina_execucoes
  FOR ALL TO authenticated USING (rpa_tem_acesso()) WITH CHECK (rpa_tem_acesso());

-- SECURITY INVOKER (padrão): as políticas acima continuam valendo.
-- p_execucoes: [{ "dia_semana": 1..7, "hora": "HH:MM", "tipo": "RPA|PBI|FAB" }, ...]
CREATE OR REPLACE FUNCTION rpa_salvar_execucoes(p_rotina_id uuid, p_execucoes jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rpa_rotina_execucoes WHERE rotina_id = p_rotina_id;

  INSERT INTO rpa_rotina_execucoes (rotina_id, dia_semana, hora, tipo)
  SELECT p_rotina_id,
         (e ->> 'dia_semana')::smallint,
         (e ->> 'hora')::time,
         NULLIF(e ->> 'tipo', '')
  FROM jsonb_array_elements(COALESCE(p_execucoes, '[]'::jsonb)) AS e
  WHERE COALESCE(e ->> 'hora', '') <> '';
END;
$$;

GRANT EXECUTE ON FUNCTION rpa_salvar_execucoes(uuid, jsonb) TO authenticated;
