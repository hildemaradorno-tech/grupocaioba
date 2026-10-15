-- Nº da SG (solicitação de garantia) digitado em "Editar Garantia" no Contas a Receber HONDA.
ALTER TABLE honda_contas_receber_anotacoes
  ADD COLUMN IF NOT EXISTS numero_sg text;
