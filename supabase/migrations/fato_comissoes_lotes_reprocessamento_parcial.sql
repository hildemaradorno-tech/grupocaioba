-- Reprocessamento parcial: quando um funcionário está nesta lista, ele pode ser recalculado/
-- salvo de novo em Cálculo de Comissões mesmo com o lote Conferido/Processado — sem reabrir o
-- lote inteiro (sem derrubar o status de quem não foi liberado). Populada por
-- liberarReprocessamentoLote e esvaziada aos poucos por destravarFuncionariosSalvosLote
-- (conforme cada funcionário liberado é recalculado e salvo de novo).
ALTER TABLE fato_comissoes_lotes ADD COLUMN IF NOT EXISTS funcionarios_liberados_reprocessamento uuid[] NOT NULL DEFAULT '{}';
