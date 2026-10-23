-- Modelos de Nota de Débito (Configurações) e notas emitidas (Garantias DAF)
CREATE TABLE IF NOT EXISTS gar_modelos_nota_debito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL,
  descricao      text,
  tipos_codigos  text,                 -- códigos de tipo de garantia separados por vírgula (ex: 'G03,G16')
  logo           text,                 -- data URL da logo (opcional)
  conteudo_html  text NOT NULL DEFAULT '',
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gar_notas_debito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id      uuid REFERENCES gar_modelos_nota_debito(id) ON DELETE SET NULL,
  modelo_nome    text,
  garantia_id    uuid REFERENCES gar_garantias(id) ON DELETE SET NULL,
  empresa_id     uuid,
  ano            integer NOT NULL,
  sequencia      integer NOT NULL,
  numero         text NOT NULL,        -- ex: '0001/2026'
  data_emissao   date NOT NULL DEFAULT current_date,
  valor_total    numeric,
  dados_json     jsonb,                -- cópia dos dados usados na emissão (itens, placa etc.)
  criado_em      timestamptz NOT NULL DEFAULT now(),
  criado_por     text,
  CONSTRAINT uq_gar_notas_debito_empresa_ano_seq UNIQUE NULLS NOT DISTINCT (empresa_id, ano, sequencia)
);
CREATE INDEX IF NOT EXISTS idx_gar_notas_debito_garantia ON gar_notas_debito (garantia_id);

ALTER TABLE gar_modelos_nota_debito ENABLE ROW LEVEL SECURITY;
ALTER TABLE gar_notas_debito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON gar_modelos_nota_debito;
DROP POLICY IF EXISTS "auth_all" ON gar_notas_debito;
CREATE POLICY "auth_all" ON gar_modelos_nota_debito FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON gar_notas_debito FOR ALL TO authenticated USING (true) WITH CHECK (true);
