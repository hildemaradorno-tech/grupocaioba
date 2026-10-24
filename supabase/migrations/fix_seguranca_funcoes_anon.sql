-- Funções do schema public herdavam EXECUTE do grupo PUBLIC, então o role anon
-- conseguia chamá-las via /rest/v1/rpc (inclusive as SECURITY DEFINER approve_metas_*,
-- que ignoram RLS). Remove de PUBLIC/anon; usuários logados e backend seguem normais.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;
