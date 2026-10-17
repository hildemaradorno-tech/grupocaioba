-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Programação de auditorias automáticas (engrenagem → "Programar auditorias", só Admin).
-- O backend (node-cron, a cada 5 min) gera a auditoria na hora programada:
--   * Trucks → SharePoint ROF001_OSABERTA; Motos → API MicroWork
--   * NÃO gera se a empresa já tiver auditoria em Conferência ou A Responder (resultado 'pulada')
--   * no máximo 1 execução por agendamento por dia (ultima_execucao_data)
-- dias_semana: 0 = domingo … 6 = sábado. hora: horário local (America/Campo_Grande).
-- ============================================================

CREATE TABLE IF NOT EXISTS aud_agendamentos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid NOT NULL REFERENCES dim_empresas(id) ON DELETE CASCADE,
  dias_semana          int[] NOT NULL DEFAULT '{}',
  hora                 time NOT NULL DEFAULT '07:00',
  responsavel_id       uuid REFERENCES dim_funcionarios(id) ON DELETE SET NULL,
  responsavel_nome     text,
  ativo                boolean NOT NULL DEFAULT true,
  ultima_execucao_data date,
  ultima_execucao_em   timestamptz,
  ultimo_resultado     text CHECK (ultimo_resultado IN ('gerada', 'pulada', 'erro')),
  ultima_mensagem      text,
  criado_por           text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aud_agendamentos_empresa ON aud_agendamentos(empresa_id);

ALTER TABLE aud_agendamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_agendamentos;
CREATE POLICY "auth_all" ON aud_agendamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
