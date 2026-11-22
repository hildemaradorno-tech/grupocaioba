-- Monitores de Processos (21/11/2026): Arquivos Extraídos vira uma tabela — uma linha por arquivo, com a pasta onde
-- ele fica: [{ "arquivo": "RFS026_RELICMSESTADO TRES LAGOAS", "pasta": "SHAREPOINT / BANCO DE DADOS - ..." }, ...]
-- Os campos de texto antigos (relatorios_extraidos, local_fonte) continuam e passam a ser preenchidos a partir da
-- tabela (lista dos nomes / das pastas), para nada que lê esses campos quebrar.
alter table public.rpa_processos
  add column if not exists arquivos_extraidos jsonb not null default '[]'::jsonb;

-- Cópia do que já estava preenchido: o texto de "Arquivos Extraídos" vira a 1ª linha, com o "Local da Fonte" como pasta
update public.rpa_processos
   set arquivos_extraidos = jsonb_build_array(jsonb_build_object(
         'arquivo', relatorios_extraidos,
         'pasta', coalesce(local_fonte, '')))
 where jsonb_array_length(arquivos_extraidos) = 0
   and coalesce(trim(relatorios_extraidos), '') <> '';
