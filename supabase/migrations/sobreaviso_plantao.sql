-- Controle de Sobreaviso/Plantão (menu Comissões) — substitui a planilha manual enviada ao RH.
-- config_sobreaviso: linha única com as taxas vigentes de R$/dia e R$/deslocamento, editável na tela.
-- rh_sobreaviso_plantao: lançamento mensal por colaborador, com snapshot das taxas usadas no cálculo
-- (evita que o histórico mude retroativamente se a config for alterada depois).

CREATE TABLE IF NOT EXISTS config_sobreaviso (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_dia_sobreaviso   numeric NOT NULL DEFAULT 34.29,
  valor_deslocamento     numeric NOT NULL DEFAULT 40.00,
  atualizado_em          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO config_sobreaviso (valor_dia_sobreaviso, valor_deslocamento)
SELECT 34.29, 40.00
WHERE NOT EXISTS (SELECT 1 FROM config_sobreaviso);

CREATE TABLE IF NOT EXISTS rh_sobreaviso_plantao (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id         uuid NOT NULL REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  funcionario_nome       text NOT NULL,
  mes_referencia         date NOT NULL,
  dias_sobreaviso        integer NOT NULL DEFAULT 0,
  deslocamentos          integer NOT NULL DEFAULT 0,
  cliente_atendido       text,
  valor_dia_sobreaviso   numeric NOT NULL,
  valor_deslocamento     numeric NOT NULL,
  total                  numeric NOT NULL,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  atualizado_em          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_sobreaviso_mes ON rh_sobreaviso_plantao(mes_referencia);

ALTER TABLE config_sobreaviso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON config_sobreaviso;
CREATE POLICY "auth_all" ON config_sobreaviso FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE rh_sobreaviso_plantao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON rh_sobreaviso_plantao;
CREATE POLICY "auth_all" ON rh_sobreaviso_plantao FOR ALL TO authenticated USING (true) WITH CHECK (true);
