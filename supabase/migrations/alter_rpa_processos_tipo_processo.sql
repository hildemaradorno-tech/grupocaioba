-- Monitores de Processos (21/11/2026): "Tipo de RPA" do processo — Extração de Arquivos ou Operacional.
-- Escolhido em Editar Processo / Relatório; aparece primeiro (antes do Objetivo) ao expandir o processo.
alter table public.rpa_processos
  add column if not exists tipo_processo text;

alter table public.rpa_processos
  drop constraint if exists rpa_processos_tipo_processo_chk;
alter table public.rpa_processos
  add constraint rpa_processos_tipo_processo_chk check (tipo_processo is null or tipo_processo in ('EXTRACAO', 'OPERACIONAL'));
