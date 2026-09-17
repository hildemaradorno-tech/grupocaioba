-- Persiste Nº Lançamento e Data de Vencimento do título a receber (RFN003) direto
-- na OS (gar_garantias), igual já é feito com numero_titulo — hoje esses dois campos
-- só existiam "ao vivo" (buscados no RFN003 a cada carregamento) e sumiam da tela da
-- OS assim que o título saía de Títulos a Receber (ex: já liquidado/pago).
ALTER TABLE public.gar_garantias
  ADD COLUMN IF NOT EXISTS titulo_nro_lancamento TEXT,
  ADD COLUMN IF NOT EXISTS titulo_data_vencimento DATE;
