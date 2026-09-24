-- Catálogo de menus do Dealer.net passa a guardar o código de cada nó e o tipo (menu, relatório
-- ou botão). É com o código que a importação dos relatórios RSG001 (menus e submenus) e RSG003
-- (botões) enxerga o que mudou e cria/atualiza/exclui, em vez de comparar só por nome.
-- Nós antigos ficam com codigo/tipo NULL (legado) e são substituídos na primeira importação.
ALTER TABLE governanca_menus ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE governanca_menus ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE governanca_menus DROP CONSTRAINT IF EXISTS governanca_menus_tipo_check;
ALTER TABLE governanca_menus ADD CONSTRAINT governanca_menus_tipo_check CHECK (tipo IS NULL OR tipo IN ('menu', 'relatorio', 'botao'));
CREATE UNIQUE INDEX IF NOT EXISTS governanca_menus_codigo_uk ON governanca_menus (sistema, codigo) WHERE codigo IS NOT NULL;
