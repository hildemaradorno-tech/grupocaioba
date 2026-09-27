-- Sistema de origem da Base de Cálculo (Dealer.net ou MicroWork Cloud) — mesmos valores de
-- dim_empresas.sistema_dms. Nullable: bases antigas ficam sem sistema até serem editadas.
ALTER TABLE dim_bases_calculo ADD COLUMN IF NOT EXISTS sistema text;
