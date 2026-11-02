-- Regras PJ do tipo "Coparticipação": pj_coparticipacao = { percentual, empresas: [{ empresa_id, empresa_nome }] }.
-- O usuário lança o valor total do boleto de cada prestador, por mês, em Prestadores de Serviços;
-- o sistema aplica o % e divide em partes iguais entre as empresas, como reembolso ao prestador.
-- Null nos outros tipos.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_coparticipacao jsonb;

-- Valor do boleto lançado por regra × funcionário × mês (periodo = 'YYYY-MM').
CREATE TABLE IF NOT EXISTS pj_coparticipacao_lancamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id       uuid NOT NULL,            -- grupo_politica_id da regra PJ
  funcionario_id uuid NOT NULL REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  periodo        text NOT NULL,
  valor_boleto   numeric(14,2) NOT NULL CHECK (valor_boleto >= 0),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  UNIQUE (regra_id, funcionario_id, periodo)
);
ALTER TABLE pj_coparticipacao_lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON pj_coparticipacao_lancamentos;
DROP POLICY IF EXISTS escrita_por_menu ON pj_coparticipacao_lancamentos;
CREATE POLICY sel_auth ON pj_coparticipacao_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON pj_coparticipacao_lancamentos FOR ALL TO authenticated
  USING (sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'regras-pj']))
  WITH CHECK (sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'regras-pj']));

NOTIFY pgrst, 'reload schema';
