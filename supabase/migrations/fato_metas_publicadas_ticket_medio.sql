-- Metas - Consultor: ticket médio planejado (ticket_total, R$/OS) e o total de passagens
-- (OS) do mês, publicados junto com a meta para a Matriz KPIs calcular o Ticket Médio da
-- Oficina do(s) consultor(es) sem reler o planejamento diretamente.
ALTER TABLE public.fato_metas_publicadas
  ADD COLUMN IF NOT EXISTS ticket_total numeric,
  ADD COLUMN IF NOT EXISTS passagens numeric;
