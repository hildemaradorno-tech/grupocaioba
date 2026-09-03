-- "Tipo do Processo" do leiaute do Domínio (ex: "11" = Mensal) — até agora estava fixo em "11"
-- direto no código; vira campo editável por Política de Comissão, igual o Código da Rubrica,
-- pra cobrir o caso de alguma comissão precisar de um tipo de processo diferente.
ALTER TABLE fato_politica_comissao ADD COLUMN IF NOT EXISTS tipo_processo text;
