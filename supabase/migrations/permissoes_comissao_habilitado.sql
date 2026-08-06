-- Trava mestre do escopo de Cálculo de Comissões: por padrão (false), o grupo consegue
-- ABRIR a tela (se tiver a página liberada) mas não enxerga NENHUM funcionário — precisa
-- de habilitação manual explícita antes das 5 dimensões (Empresa/Área/Departamento/
-- Setor/Agrupamento de Cargos) configuradas em permissoes_comissao_modo/valor passarem
-- a valer. Evita que um grupo recém-criado, sem nada configurado ainda, veja todo mundo
-- por omissão.
ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS comissao_escopo_habilitado boolean NOT NULL DEFAULT false;
