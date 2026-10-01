-- audext_tem_acesso() esquecia 'auditoria-externa/tipos-divergencia' na lista de
-- menus que liberam acesso ao módulo — mesmo gap já corrigido antes pra
-- 'auditoria-externa/tipos-acao' (ver fix_audext_tem_acesso_tipos_acao.sql).
-- Executar no Supabase SQL Editor.
CREATE OR REPLACE FUNCTION audext_tem_acesso()
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
      AND pg.menu_path IN (
        'auditoria-externa/ciclos',
        'auditoria-externa/dashboard',
        'auditoria-externa/divergencias',
        'auditoria-externa/plano-acao',
        'auditoria-externa/tipos-acao',
        'auditoria-externa/tipos-divergencia'
      )
  );
$$;
