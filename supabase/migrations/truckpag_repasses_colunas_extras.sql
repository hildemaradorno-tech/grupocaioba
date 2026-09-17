-- Adiciona as colunas de NF-e/NFS-e do arquivo de repasse que ainda não eram capturadas.
ALTER TABLE truckpag_repasses
  ADD COLUMN IF NOT EXISTS valor_parcela_nf_e numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_nfs_e numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_parcela_nfs_e numeric(14,2);
