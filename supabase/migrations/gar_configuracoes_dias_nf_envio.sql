-- Garantias DAF — Regras do Sistema (engrenagem → menu Títulos a Receber)
-- "Dias para Envio da NF": a linha "NF sem envio" do card Pendências (Títulos a Receber) mostra a NF
-- não enviada à fábrica e emitida há N dias ou mais. Até aqui o valor era fixo em 4.
ALTER TABLE gar_configuracoes ADD COLUMN IF NOT EXISTS dias_nf_envio INTEGER NOT NULL DEFAULT 4;
