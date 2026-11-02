-- Anexos dos prestadores PJ:
--  * tipo 'DOCUMENTO': documento obrigatório de uma Regra PJ (fato_politica_comissao.pj_documentos =
--    ['Boleto', 'Extrato', ...]) — anexado em Prestadores de Serviços; sem todos, o Conferir Comissões trava.
--  * tipo 'NF': Nota Fiscal emitida pelo prestador, uma por CNPJ do quadro "Emissão das Notas Fiscais" —
--    anexada em Minha Nota Fiscal; com todas, o lote fica "Nota Fiscal Recebida".
-- Arquivo no bucket privado 'pj-anexos', caminho {funcionario_id}/{periodo}/{arquivo}.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS pj_documentos jsonb;

CREATE TABLE IF NOT EXISTS pj_anexos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  periodo        text NOT NULL,             -- 'YYYY-MM'
  tipo           text NOT NULL CHECK (tipo IN ('DOCUMENTO', 'NF')),
  regra_id       uuid,                      -- DOCUMENTO: grupo_politica_id da regra PJ
  documento      text,                      -- DOCUMENTO: nome do documento exigido na regra
  cnpj           text,                      -- NF: CNPJ (só dígitos) para o qual a nota foi emitida
  empresa_nome   text,
  nome_arquivo   text NOT NULL,
  path           text NOT NULL UNIQUE,
  tamanho        integer,
  content_type   text,
  enviado_em     timestamptz NOT NULL DEFAULT now(),
  enviado_por    text
);
CREATE INDEX IF NOT EXISTS pj_anexos_func_periodo ON pj_anexos (funcionario_id, periodo);

ALTER TABLE pj_anexos ENABLE ROW LEVEL SECURITY;
-- Quem opera comissões PJ vê/anexa/remove de todos; o próprio PJ (Minha Nota Fiscal) só os dele.
DROP POLICY IF EXISTS pj_anexos_acesso ON pj_anexos;
CREATE POLICY pj_anexos_acesso ON pj_anexos FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes', 'regras-pj']))
    OR ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id())))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes', 'regras-pj']))
    OR ((SELECT sec_tem_menu('minha-nota-fiscal')) AND funcionario_id = (SELECT sec_meu_funcionario_id())));

-- Bucket privado: até 5 MB, só PDF e imagem.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pj-anexos', 'pj-anexos', false, 5242880, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS pj_anexos_select ON storage.objects;
DROP POLICY IF EXISTS pj_anexos_insert ON storage.objects;
DROP POLICY IF EXISTS pj_anexos_delete ON storage.objects;
CREATE POLICY pj_anexos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pj-anexos' AND (
    (SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes', 'regras-pj']))
    OR ((SELECT sec_tem_menu('minha-nota-fiscal')) AND (storage.foldername(name))[1] = (SELECT sec_meu_funcionario_id())::text)));
CREATE POLICY pj_anexos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pj-anexos' AND (
    (SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes', 'regras-pj']))
    OR ((SELECT sec_tem_menu('minha-nota-fiscal')) AND (storage.foldername(name))[1] = (SELECT sec_meu_funcionario_id())::text)));
CREATE POLICY pj_anexos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pj-anexos' AND (
    (SELECT sec_tem_menu(VARIADIC ARRAY['calculo-comissoes-grupo', 'calculo-comissoes-motos', 'calculo-comissoes', 'processamento-comissoes', 'regras-pj']))
    OR ((SELECT sec_tem_menu('minha-nota-fiscal')) AND (storage.foldername(name))[1] = (SELECT sec_meu_funcionario_id())::text)));

NOTIFY pgrst, 'reload schema';
