-- Modelos de formulário reutilizáveis do módulo BPM — cadastrados uma vez e copiados para
-- dentro de um elemento (evento de início/user task) ao montar um processo no Modelador, em vez
-- de montar os campos do zero toda vez. É uma cópia, não uma referência viva: depois de usado,
-- os campos daquele elemento passam a ser independentes do modelo (editar o modelo depois não
-- afeta processos que já usaram uma cópia dele).
CREATE TABLE IF NOT EXISTS bpm_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bpm_form_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON bpm_form_templates;
CREATE POLICY "auth_all" ON bpm_form_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
