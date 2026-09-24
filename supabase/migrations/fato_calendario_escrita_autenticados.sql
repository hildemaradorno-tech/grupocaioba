-- fato_calendario só tinha policy de SELECT (leitura autenticados): o gerar_calendario_anual
-- (não é SECURITY DEFINER, roda como o usuário logado) e o "Limpar Calendário do Ano" falham
-- com "new row violates row-level security policy". Libera escrita pra usuários autenticados,
-- no mesmo padrão das demais tabelas do sistema (a permissão por tela é controlada no frontend).
DROP POLICY IF EXISTS auth_all_fato_calendario ON fato_calendario;
CREATE POLICY auth_all_fato_calendario ON fato_calendario FOR ALL TO authenticated USING (true) WITH CHECK (true);
