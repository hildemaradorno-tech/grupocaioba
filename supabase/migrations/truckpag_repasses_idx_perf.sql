-- Índice de apoio pra consultas de repasses TruckPag — tabela passou de ~2.500 pra ~6.400 linhas
-- depois de ler todos os arquivos "contas-receber-daf*" (2025, 2026, 2026.10 etc.), e a política
-- RLS por_modulo (sec_tem_menu_like) avaliada linha a linha deixou o SELECT lento o bastante pra
-- estourar o statement_timeout (8s) com a paginação OFFSET antiga, de a 1000 em 1000 linhas.
CREATE INDEX IF NOT EXISTS idx_truckpag_repasses_data_pagamento ON public.truckpag_repasses (data_pagamento);
