-- Auditoria O.S. Aberta — Metas dos indicadores do Dashboard (engrenagem → Metas dos indicadores)
-- Percentual máximo aceito do total em aberto (uma meta para todas as empresas). NULL = sem meta.
--   meta_pendentes_pct: O.S. em aberto sem o veículo na oficina (card "Total O.S. pendentes")
--   meta_mais30_pct:    veículos na oficina com O.S. aberta há mais de 30 dias (card "Total O.S. > 30 dias")
ALTER TABLE aud_configuracoes
  ADD COLUMN IF NOT EXISTS meta_pendentes_pct numeric(5,2) CHECK (meta_pendentes_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS meta_mais30_pct    numeric(5,2) CHECK (meta_mais30_pct BETWEEN 0 AND 100);

NOTIFY pgrst, 'reload schema';
