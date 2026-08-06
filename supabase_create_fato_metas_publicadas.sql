-- Execute este script no SQL Editor do Supabase para criar a tabela de publicação para Power BI

CREATE TABLE IF NOT EXISTS fato_metas_publicadas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       uuid        NOT NULL,
  empresa_nome     text,
  ano              integer     NOT NULL,
  mes              integer     NOT NULL,
  tipo             text        NOT NULL,  -- 'pecas' | 'mecanico' | 'consultor' | 'funilaria' | 'terceiros'
  colaborador_id   uuid,
  colaborador_nome text,
  departamento_id  uuid,
  departamento_nome text,
  setor_id         uuid,
  setor_nome       text,
  cargo_id         uuid,
  cargo_nome       text,
  meta_faturamento numeric(15,2),
  meta_pecas       numeric(15,2),
  meta_servicos    numeric(15,2),
  publicado_em     timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano, mes, tipo, colaborador_id)
);

-- Índices para performance no Power BI
CREATE INDEX IF NOT EXISTS idx_metas_pub_ano     ON fato_metas_publicadas (ano);
CREATE INDEX IF NOT EXISTS idx_metas_pub_empresa ON fato_metas_publicadas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_metas_pub_tipo    ON fato_metas_publicadas (tipo);
CREATE INDEX IF NOT EXISTS idx_metas_pub_colab   ON fato_metas_publicadas (colaborador_id);

-- Liberar leitura via API (para o front-end verificar última publicação)
ALTER TABLE fato_metas_publicadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura livre" ON fato_metas_publicadas FOR SELECT USING (true);
CREATE POLICY "Escrita autenticada" ON fato_metas_publicadas FOR ALL USING (auth.role() = 'authenticated');
