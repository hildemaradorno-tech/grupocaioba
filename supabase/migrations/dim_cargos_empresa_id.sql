-- Cargo volta a se relacionar com uma Empresa específica (CNPJ), não mais só com o
-- Agrupamento de Empresas — o mesmo código de cargo pode significar coisas diferentes
-- em CNPJs distintos do mesmo grupo (confirmado na planilha FUNCIONARIOS.xlsx: 144
-- combinações distintas de CNPJ+código, sem nenhuma ambiguidade).
--
-- Mantém agrupamento_empresa_id (não apaga, não é obrigatório mais nas telas) — o filtro
-- por Agrupamento na tela de Cargos passa a ser derivado via empresa->agrupamento, não
-- mais gravado direto no cargo. O índice único antigo (nome_cargo, agrupamento_empresa_id)
-- também fica — como todo cargo novo grava agrupamento_empresa_id nulo, e valores nulos
-- nunca colidem em índice único no Postgres, ele não atrapalha os cadastros daqui pra frente.
--
-- Cargos já cadastrados ficam com empresa_id vazio até serem resolvidos manualmente ou
-- pela importação da planilha (não dá pra migrar automático: um agrupamento pode ter
-- várias empresas, não tem como saber sozinho qual delas cada cargo antigo pertence).
ALTER TABLE dim_cargos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES dim_empresas(id) ON DELETE SET NULL;

-- Chave natural: dentro da mesma empresa, um código de cargo não pode repetir (mas o
-- MESMO código pode existir em empresas diferentes, e o mesmo nome de cargo pode repetir
-- dentro da empresa com códigos diferentes — confirmado na planilha, ex: "VENDEDOR" código
-- 9 e "VENDEDOR(A)" código 86 na mesma empresa).
CREATE UNIQUE INDEX IF NOT EXISTS dim_cargos_empresa_codigo_unique
  ON dim_cargos (empresa_id, codigo_cargo)
  WHERE empresa_id IS NOT NULL AND codigo_cargo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dim_cargos_empresa_id ON dim_cargos(empresa_id);

-- dim_cargo_ganhos ("Ganhos" em Cargos e Remunerações) hoje só denormaliza
-- agrupamento_empresa_id a partir do cargo — passa a denormalizar empresa_id também,
-- mesmo padrão. Coluna antiga fica (não usada em nenhuma leitura hoje, só gravação).
ALTER TABLE dim_cargo_ganhos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES dim_empresas(id) ON DELETE SET NULL;
