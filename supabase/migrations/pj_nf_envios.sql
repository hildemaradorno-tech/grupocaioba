-- Envio da Nota Fiscal pelo prestador PJ (Minha Nota Fiscal → botão Confirmar):
--  * ENVIADA   : o PJ anexou todas as notas e confirmou → no Processamento fica "Receber Nota Fiscal"
--                e para o PJ "Aguardando recebimento da Nota Fiscal" (anexos travados).
--  * DEVOLVIDA : o Processamento devolveu (com motivo) → volta a "Aguardando Nota Fiscal" para o PJ corrigir.
--  * RECEBIDA  : o Processamento confirmou o recebimento → funcionário entra em
--                fato_comissoes_lotes.funcionarios_processados ("Processado" / "Nota Fiscal Recebida").
-- Uma linha por lote + funcionário; o Conferido DP do lote apaga as linhas (novo ciclo).
CREATE TABLE IF NOT EXISTS pj_nf_envios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id          uuid NOT NULL REFERENCES fato_comissoes_lotes(id) ON DELETE CASCADE,
  funcionario_id   uuid NOT NULL REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  periodo          text NOT NULL,             -- 'YYYY-MM'
  status           text NOT NULL CHECK (status IN ('ENVIADA', 'DEVOLVIDA', 'RECEBIDA')),
  enviado_em       timestamptz,
  enviado_por      text,
  devolvido_em     timestamptz,
  devolvido_por    text,
  motivo_devolucao text,
  recebido_em      timestamptz,
  recebido_por     text,
  UNIQUE (lote_id, funcionario_id)
);
CREATE INDEX IF NOT EXISTS pj_nf_envios_periodo ON pj_nf_envios (periodo);

ALTER TABLE pj_nf_envios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pj_nf_envios_operacao ON pj_nf_envios;
DROP POLICY IF EXISTS pj_nf_envios_pj_ler ON pj_nf_envios;
DROP POLICY IF EXISTS pj_nf_envios_pj_enviar ON pj_nf_envios;
DROP POLICY IF EXISTS pj_nf_envios_pj_reenviar ON pj_nf_envios;
-- Quem opera comissões PJ: tudo (receber, devolver).
CREATE POLICY pj_nf_envios_operacao ON pj_nf_envios FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes'])));
-- O próprio PJ (Minha Nota Fiscal): lê as dele, envia, e reenvia só depois de devolvida.
CREATE POLICY pj_nf_envios_pj_ler ON pj_nf_envios FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id()));
CREATE POLICY pj_nf_envios_pj_enviar ON pj_nf_envios FOR INSERT TO authenticated
  WITH CHECK ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id()) AND status = 'ENVIADA');
CREATE POLICY pj_nf_envios_pj_reenviar ON pj_nf_envios FOR UPDATE TO authenticated
  USING ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id()) AND status = 'DEVOLVIDA')
  WITH CHECK ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id()) AND status = 'ENVIADA');

NOTIFY pgrst, 'reload schema';
