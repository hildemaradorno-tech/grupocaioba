-- Auditoria O.S. Aberta (nov/2026): o Dashboard ganhou permissão própria (auditoria-os-aberto/dashboard).
-- Liberado a todo grupo que já via o Controle (auditoria-os-aberto), a pedido do usuário (11/11/2026).
INSERT INTO permissoes_grupo (grupo_id, menu_path)
SELECT p.grupo_id, 'auditoria-os-aberto/dashboard'
FROM permissoes_grupo p
WHERE p.menu_path = 'auditoria-os-aberto'
  AND NOT EXISTS (SELECT 1 FROM permissoes_grupo q WHERE q.grupo_id = p.grupo_id AND q.menu_path = 'auditoria-os-aberto/dashboard');
