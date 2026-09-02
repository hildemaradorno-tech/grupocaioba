-- Sistema DMS (Dealer Management System) que a empresa utiliza — Dealer.net ou MicroWork Cloud.
ALTER TABLE dim_empresas ADD COLUMN IF NOT EXISTS sistema_dms text;

-- Número da filial — só faz sentido pra empresas no MicroWork Cloud (o Dealer.net não usa esse
-- conceito de filial numerada); fica livre pra editar mesmo fora do MicroWork, sem trava de banco.
ALTER TABLE dim_empresas ADD COLUMN IF NOT EXISTS numero_filial text;
