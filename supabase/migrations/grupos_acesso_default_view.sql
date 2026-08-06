-- Modo de visualização padrão (tabela/dashboard) para as telas de Garantias DAF
-- (Em Andamento, Encerrada, Títulos a Receber), configurável por grupo de acesso.
ALTER TABLE grupos_acesso
  ADD COLUMN IF NOT EXISTS garantias_daf_default_view text NOT NULL DEFAULT 'tabela';

ALTER TABLE grupos_acesso
  DROP CONSTRAINT IF EXISTS grupos_acesso_garantias_daf_default_view_check;

ALTER TABLE grupos_acesso
  ADD CONSTRAINT grupos_acesso_garantias_daf_default_view_check
  CHECK (garantias_daf_default_view IN ('tabela', 'dashboard'));
