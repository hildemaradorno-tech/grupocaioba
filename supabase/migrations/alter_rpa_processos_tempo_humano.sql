-- Monitor Robert Automation (21/11/2026): "Tempo Humano (min)" do processo — quanto uma pessoa levaria para fazer à mão
-- o que o robô faz em uma execução. O card "Tempo total humano" do Resumo soma: execuções com sucesso × este tempo.
alter table public.rpa_processos
  add column if not exists tempo_humano_min integer check (tempo_humano_min is null or tempo_humano_min >= 0);
