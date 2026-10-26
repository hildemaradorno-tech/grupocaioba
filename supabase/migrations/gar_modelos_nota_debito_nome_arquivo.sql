-- Padrão do nome do arquivo PDF da Nota de Débito (mesmos campos {{ }} do modelo).
ALTER TABLE gar_modelos_nota_debito ADD COLUMN IF NOT EXISTS nome_arquivo TEXT;
UPDATE gar_modelos_nota_debito
SET nome_arquivo = '{{garantia.numero_sg}} - {{garantia.chassi_final}} - ND'
WHERE nome_arquivo IS NULL OR nome_arquivo = '';
