-- Custos de Projetos: Tipo do custo (25/11/2026) — seletor separado da Categoria.
-- Valores na tela: RPA | Sistema | Outros. Tipo RPA mostra Horas de trabalho e o custo por hora (valor / horas).
ALTER TABLE proj_custos_lancamentos
  ADD COLUMN IF NOT EXISTS tipo text;

NOTIFY pgrst, 'reload schema';
