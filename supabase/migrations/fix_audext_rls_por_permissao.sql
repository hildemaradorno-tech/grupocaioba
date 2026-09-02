-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Fecha o acesso direto via API: só quem tem permissão de grupo pra pelo
-- menos uma das telas de Auditoria Externa (ou é admin) consegue ler/gravar
-- nas tabelas audext_*. Antes disso, a política "auth_all" liberava qualquer
-- usuário logado no Portal (de qualquer setor), mesmo sem o menu liberado —
-- a proteção era só a tela esconder o link, não o banco bloquear o acesso.
-- Executar no Supabase SQL Editor
-- ============================================================

-- Compara por e-mail, não por auth.uid()/usuarios.id — o próprio app evita
-- essa comparação direta (ver comentário em AuthContext.jsx loadPermissions:
-- "Busca por email — evita mismatch entre auth.users.id e usuarios.id").
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
        'auditoria-externa/plano-acao'
      )
  );
$$;

DROP POLICY IF EXISTS "auth_all" ON audext_ciclos;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_ciclos;
CREATE POLICY "audext_acesso_modulo" ON audext_ciclos
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());

DROP POLICY IF EXISTS "auth_all" ON audext_achados;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_achados;
CREATE POLICY "audext_acesso_modulo" ON audext_achados
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());

DROP POLICY IF EXISTS "auth_all" ON audext_divergencias;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_divergencias;
CREATE POLICY "audext_acesso_modulo" ON audext_divergencias
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());

DROP POLICY IF EXISTS "auth_all" ON audext_planos_acao;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_planos_acao;
CREATE POLICY "audext_acesso_modulo" ON audext_planos_acao
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());
