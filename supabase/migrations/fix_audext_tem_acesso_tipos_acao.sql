-- audext_tem_acesso() esquecia 'auditoria-externa/tipos-acao' na lista de menus
-- que liberam acesso ao módulo — um grupo com permissão SÓ em Tipos de Ação
-- passava na tela (hasPermission no front) mas era barrado pelo RLS ao
-- ler/gravar em audext_tipos_acao (e nas demais tabelas audext_*, já que a
-- função é compartilhada). Executar no Supabase SQL Editor.
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
        'auditoria-externa/tipos-acao'
      )
  );
$$;
