-- Anotações manuais sobre os títulos do Contas a Receber HONDA (tela /honda/contas-a-receber).
-- Os títulos em si vêm da API do MicroWork a cada "Atualizar" e NÃO são gravados aqui — só o que o
-- usuário preenche (nº do sinistro, status do seguro, situação). A chave identifica o título:
-- Empresa|Documento|Parcela|NotaFiscal. No "Atualizar", as linhas cuja chave não aparece mais na
-- API (título pago/baixado) são apagadas.

CREATE TABLE IF NOT EXISTS honda_contas_receber_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  categoria text NOT NULL,            -- 'garantias' | 'revisoes' | 'seguradoras'
  empresa text,
  documento text,
  parcela text,
  nota_fiscal text,
  numero_sinistro text,
  status_seguro text,
  situacao text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);

ALTER TABLE honda_contas_receber_anotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON honda_contas_receber_anotacoes;
CREATE POLICY "auth_all" ON honda_contas_receber_anotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
