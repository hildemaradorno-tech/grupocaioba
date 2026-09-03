-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Planos de Ação (Action Items) — devolutiva da controladoria
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_planos_acao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  divergencia_id        uuid NOT NULL REFERENCES audext_divergencias(id) ON DELETE CASCADE,
  causa_raiz            text,
  acao_proposta         text,
  responsavel_setor     text,
  prazo_limite          date,
  status                text NOT NULL DEFAULT 'pendente',
  parecer_controladoria text,
  validado_em           timestamptz,
  validado_por          text,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_planos_acao DROP CONSTRAINT IF EXISTS audext_planos_setor_check;
ALTER TABLE audext_planos_acao ADD CONSTRAINT audext_planos_setor_check
  CHECK (responsavel_setor IS NULL OR responsavel_setor IN ('contabilidade', 'financeiro', 'fiscal', 'ti'));

ALTER TABLE audext_planos_acao DROP CONSTRAINT IF EXISTS audext_planos_status_check;
ALTER TABLE audext_planos_acao ADD CONSTRAINT audext_planos_status_check
  CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'validado_auditoria'));

CREATE INDEX IF NOT EXISTS audext_planos_acao_divergencia_idx ON audext_planos_acao (divergencia_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE audext_planos_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON audext_planos_acao;
CREATE POLICY "auth_all" ON audext_planos_acao FOR ALL TO authenticated USING (true) WITH CHECK (true);
