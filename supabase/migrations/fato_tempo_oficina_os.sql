-- BI Possibilidades › aba Tempo na Oficina (27/11/2026): O.S. FECHADAS dos arquivos ROF001_OSAberta_Excel <ano>,
-- gravadas no "Atualizar" (backend tempoOficinaSync) para a tela abrir na hora, sem ler o SharePoint.
-- Uma linha por O.S. + Tipo de OS (mesma chave do getOsTempoOficina). Janela gravada: fechamentos desde 1º de
-- janeiro do ano anterior.
CREATE TABLE IF NOT EXISTS public.fato_tempo_oficina_os (
  empresa_nome         text        NOT NULL,
  os_numero            text        NOT NULL,
  tipo_os_sigla        text        NOT NULL DEFAULT '',
  consultor_nome       text,
  proprietario_veiculo text,
  veiculo_placa        text,
  veiculo_chassi       text,
  total                numeric,
  data_criacao         date,
  fechado_data         date,
  situacao             text,
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_nome, os_numero, tipo_os_sigla)
);
CREATE INDEX IF NOT EXISTS fato_tempo_oficina_os_numero ON public.fato_tempo_oficina_os (os_numero);
CREATE INDEX IF NOT EXISTS fato_tempo_oficina_os_fechado ON public.fato_tempo_oficina_os (fechado_data);

-- Leitura para quem tem a tela do BI; gravação só pelo backend (service role).
ALTER TABLE public.fato_tempo_oficina_os ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_bi ON public.fato_tempo_oficina_os;
CREATE POLICY sel_bi ON public.fato_tempo_oficina_os FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['bi/possibilidades'])));
NOTIFY pgrst, 'reload schema';
