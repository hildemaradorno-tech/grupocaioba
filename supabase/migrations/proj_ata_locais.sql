-- Locais de reunião usados em "Gerar Ata de Reunião" — antes ficavam só no
-- localStorage do navegador, então um local cadastrado num computador/navegador
-- não aparecia em outro (ex: cadastrado no ambiente local de desenvolvimento e
-- não aparecendo no acesso online/produção). Movendo para o banco pra ficar
-- compartilhado entre todos os acessos, no mesmo padrão de proj_empresas/proj_departamentos.
CREATE TABLE IF NOT EXISTS proj_ata_locais (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proj_ata_locais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON proj_ata_locais;
CREATE POLICY "auth_all" ON proj_ata_locais FOR ALL TO authenticated USING (true) WITH CHECK (true);
