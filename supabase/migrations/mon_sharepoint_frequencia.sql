-- Governança › Monitor SharePoint (19/11/2026): frequência esperada de atualização de cada planilha, definida
-- pelo usuário na aba Planilhas. Sem linha aqui, vale o padrão do código (services/sharepointMonitor.js).
-- Lida e gravada só pelo backend (service role) — rota /api/sharepoint-monitor, que exige o menu.
create table if not exists public.mon_sharepoint_frequencia (
  fonte_id      text primary key,               -- id da planilha no monitor (ex.: 'rof037', 'fc-12')
  frequencia    text not null check (frequencia in ('diaria', 'semanal', 'mensal', 'manual')),
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

alter table public.mon_sharepoint_frequencia enable row level security;
-- sem políticas: anon/authenticated não leem nem gravam; o backend usa service role
revoke all on public.mon_sharepoint_frequencia from anon, authenticated;
