-- ============================================================
-- Habilita RLS nas tabelas que ficaram "Unrestricted" no Supabase
-- (mesmo padrão usado no resto do projeto: FOR ALL TO authenticated
-- USING (true) WITH CHECK (true) — o app só libera acesso após login,
-- então basta exigir usuário autenticado).
-- Executar no Supabase SQL Editor.
--
-- Observação: fato_rascunho_metas_funilaria_pintura e
-- fato_rascunho_metas_servicos_mecanico tiveram o RLS desabilitado
-- de propósito em fix_rls_funilaria_pintura.sql / fix_rls_servicos_mecanico.sql.
-- Esta migration reabilita com a policy correta (em vez de deixar
-- desabilitado) para fechar essas tabelas também.
-- ============================================================

-- Módulo Auditoria (OS de auditoria)
ALTER TABLE aud_auditoria_os ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_auditoria_os;
CREATE POLICY "auth_all" ON aud_auditoria_os FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE aud_auditorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_auditorias;
CREATE POLICY "auth_all" ON aud_auditorias FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE aud_responsaveis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_responsaveis;
CREATE POLICY "auth_all" ON aud_responsaveis FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE aud_situacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_situacoes;
CREATE POLICY "auth_all" ON aud_situacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Garantias DAF
ALTER TABLE dim_tipo_titulo_garantia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_tipo_titulo_garantia;
CREATE POLICY "auth_all" ON dim_tipo_titulo_garantia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Metas (rascunho) — Funcionários
ALTER TABLE fato_rascunho_metas_funilaria_pintura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_rascunho_metas_funilaria_pintura;
CREATE POLICY "auth_all" ON fato_rascunho_metas_funilaria_pintura FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fato_rascunho_metas_servicos_consultor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_rascunho_metas_servicos_consultor;
CREATE POLICY "auth_all" ON fato_rascunho_metas_servicos_consultor FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fato_rascunho_metas_servicos_mecanico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_rascunho_metas_servicos_mecanico;
CREATE POLICY "auth_all" ON fato_rascunho_metas_servicos_mecanico FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fato_rascunho_metas_terceiros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_rascunho_metas_terceiros;
CREATE POLICY "auth_all" ON fato_rascunho_metas_terceiros FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Gestão de Projetos — Atas de Reunião
ALTER TABLE proj_atas_reuniao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON proj_atas_reuniao;
CREATE POLICY "auth_all" ON proj_atas_reuniao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- user_google_tokens: só é lido/gravado pelo backend com a service role key
-- (backend/routes/googleCalendar.js), que ignora RLS. Não existe acesso direto
-- do frontend a essa tabela, então habilita RLS SEM nenhuma policy — fecha o
-- acesso via anon/authenticated key e mantém o backend funcionando normalmente.
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
