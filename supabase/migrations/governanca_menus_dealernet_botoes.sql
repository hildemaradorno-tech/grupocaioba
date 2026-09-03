-- ============================================================
-- Importação do nível de BOTÕES dentro de cada menu (Dealer.net)
-- Gerado a partir de Arquivos/botoes.xlsx, casando pelo nome do menu
-- (e pelo nome do pai quando havia ambiguidade) contra o catálogo
-- já existente em governanca_menus. Botões viram nós-filho comuns,
-- então funcionam automaticamente na matriz de Grupo de Acessos.
-- Menus casados: 797 | botões: 2750
-- Executar no Supabase SQL Editor
-- ============================================================

-- Cadastro > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Agente Cobrador
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agente Cobrador' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Banco
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Banco' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Chave Remessa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chave Remessa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Condição de Pagamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Condição de Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Conta Caixa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conta Caixa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Conta Gerencial
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conta Gerencial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Conta Interna
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conta Interna' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Extrato Bancário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Extrato Bancário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Instrução Bancária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Instrução Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Modalidade de Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Modalidade de Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Moeda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Moeda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Motivo de Rejeição Bancária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo de Rejeição Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Ocorrência Bancária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ocorrência Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Pagamento de Débito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamento de Débito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Cobrança
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Crédito/Débito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Crédito/Débito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Documento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Documento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Ficha Razão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Ficha Razão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Título
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Título' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > COAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Grupo Financeiro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Operadora Cartão Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Operadora Cartão Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Conta Bancaria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Conta Bancaria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Rateio Padrão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Rateio Padrão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Tipo de Ocorrência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Ocorrência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Cobrança Automática
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cobrança Automática' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Máquina POS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Máquina POS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > CEP Inválido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CEP Inválido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro > Dados de Títulos e Boletos Avulsos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dados de Títulos e Boletos Avulsos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Pessoa (Será Descontinuado Julho/2019)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pessoa (Será Descontinuado Julho/2019)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Empresa', 0), ('Análise de Crédito', 1), ('Faturamento', 2), ('Financeiro', 3), ('Endereço', 4), ('Contato', 5), ('Consórcio', 6), ('Frota', 7), ('Regra de Uso', 8), ('Alterar Documento (CPF/CNPJ)', 9), ('Alterar Nome (Razão Social)', 10), ('SMS', 11), ('Email', 12), ('Negativa', 13), ('Bloqueia Entrada Oficina', 14), ('Desativar', 15), ('Segmento de Mercado', 16), ('Enquadramento', 17), ('Politica Desconto', 18), ('Crédito', 19), ('Incluir', 20), ('Alterar', 21), ('Excluir', 22)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Query
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Query' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Full Search
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Full Search' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Manutenção Preços', 0), ('Incluir', 1), ('Alterar', 2), ('Excluir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Tipo de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Grupo Contábil
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Grupo Lucratividade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Lucratividade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Localização de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Localização de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Agrupamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agrupamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Motivo de Compra em Outra Fonte
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo de Compra em Outra Fonte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Motivo de Compra do Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo de Compra do Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Meio de Transporte
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Meio de Transporte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Tabela de Preço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabela de Preço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Grupo de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Classificação da Montadora
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação da Montadora' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Motivo de Reclamação de Faturamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo de Reclamação de Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Classificação ABC
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação ABC' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Classificação AJ > Configuração AJ
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configuração AJ' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação AJ' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Classificação AJ > Classificação SCC
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação SCC' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação AJ' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Marca', 0), ('Imagem', 1), ('Referência', 2), ('Estoque', 3), ('Preços', 4), ('Modelo', 5), ('Empresa', 6), ('NCM', 7), ('Incluir', 8), ('Alterar', 9), ('Excluir', 10)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Acordo de Fornecimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Acordo de Fornecimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Unidade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Unidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Tipo de Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > Local de Entrega
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Local de Entrega' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Produto > ANP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='ANP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Grupo de Apuração
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Apuração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > GNRE Configuração
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='GNRE Configuração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Observação Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Observação Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Escrituração
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Escrituração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Escrituração > Autorização de Nota Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autorização de Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Escrituração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Importação > Autorização de Nota Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autorização de Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Indicador de Presença
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Indicador de Presença' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Regra DIFAL
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Regra DIFAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Regra DIFAL > REINF - Processo Administrativo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF - Processo Administrativo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Regra DIFAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Regra DIFAL > REINF - Classificação de Serviços Prestados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF - Classificação de Serviços Prestados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Regra DIFAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Regra DIFAL > REINF Eletrônico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF Eletrônico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Regra DIFAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > SPED EFD
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SPED EFD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > SPED EFD > REINF - Processo Administrativo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF - Processo Administrativo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SPED EFD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > SPED EFD > REINF - Classificação de Serviços Prestados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF - Classificação de Serviços Prestados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SPED EFD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > SPED EFD > REINF Eletrônico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='REINF Eletrônico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SPED EFD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fiscal > Processo Judicial
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Processo Judicial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Prospect
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prospect' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Centro de Resultado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Centro de Resultado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Estrutura
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estrutura' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Histórico Padrão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Histórico Padrão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Plano de Contas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Plano de Contas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > SubConta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SubConta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Tipo de Lote
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Lote' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Tipo de SubConta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de SubConta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Tipo de Conta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Conta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Planilha
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Planilha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Evento da Folha de Pagamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Evento da Folha de Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Rateio Contábil
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Rateio Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Contabilidade > Conta Contábil X Centro de Resultado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conta Contábil X Centro de Resultado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Recursos Humanos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recursos Humanos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Recursos Humanos > Comissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recursos Humanos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Recursos Humanos > Dealer Qualification
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dealer Qualification' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recursos Humanos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Recursos Humanos > Objetivo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Objetivo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recursos Humanos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Recursos Humanos > Gerente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Gerente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recursos Humanos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Motivo de Retorno
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo de Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Cockpit LGPD
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cockpit LGPD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Franquia de KM
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Franquia de KM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Configuração
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configuração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Origem de Emissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Origem de Emissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Preço da Locação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Preço da Locação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Grupo de Locação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Locação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Tipo de Valor Adicional
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Valor Adicional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Tarifa Sazonal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tarifa Sazonal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Fleet Rental > Categoria de Locação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Categoria de Locação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fleet Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Avaliação Usado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Avaliação Usado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Prorroga', 1), ('Mostrar', 2), ('Imprimir', 3), ('Opcional', 4), ('Imagem', 5), ('Vistoria', 6), ('OS', 7), ('Veiculo', 8), ('Documento Dinamico', 9), ('Info Veiculo', 10), ('Cancelar Reparo', 11), ('Incluir', 12), ('Alterar', 13)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Recepção de Cliente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recepção de Cliente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Transfere', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Estoque > Banco de Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Banco de Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Mostrar', 1), ('Transfere Proposta', 2), ('Incluir', 3), ('Alterar', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Estoque > Acompanhamento Pedido > Preparação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Preparação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Acompanhamento Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo')))) AS pai(id)
CROSS JOIN (VALUES ('Preparação - Faturamento', 0), ('Preparação - Pátio PDI', 1), ('Preparação - Pátio Destino', 2), ('Preparação - Entrega', 3), ('Preparação - Notas Fiscais', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Estoque > Fila de Espera
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fila de Espera' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Confirmar Firm Order para Veículo', 0), ('Desafazer Associação com Chassi', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Entrega Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Entrega Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Entregar Veículo', 0), ('Reagendar', 1), ('Bloquear', 2), ('Imprimir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Acompanhamento da Preparação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Acompanhamento da Preparação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Liberar', 0), ('Reagendar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Nota Fiscal > Nota Fiscal Entrada
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Entrada' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observação NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Altera Tributo', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Incluir', 21), ('Alterar', 22)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Consulta e Liberação Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta e Liberação Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Autorizar Faturamento', 0), ('Liberar Entrega', 1), ('Liberação Extraordinária', 2), ('Imprimir Pedido', 3), ('Filtrar Vendedores', 4), ('Imprimir ATPV', 5), ('Alterar parcela de proposta faturada', 6), ('Excluir Documento', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Nota Fiscal > Nota Fiscal Saída
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Saída' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observação NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Altera Tributo', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Valor Agregado', 21), ('Incluir', 22), ('Alterar', 23)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Consulta Proposta e Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta Proposta e Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Consultar Proposta', 0), ('Acesso a Nota de Compra do Veículo(Aba A pagar)', 1), ('Margem + Retorno', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Pesquisas de Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisas de Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Consultar Pesquisa', 0), ('Efetuar Pesquisa', 1), ('Imprimir Pesquisa', 2), ('Histórico', 3), ('Cancelar Pesquisa', 4), ('Reabrir Pesquisa', 5)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Pedido F&amp;I
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pedido F&amp;I' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar Pedido F&I', 0), ('Impressão do Pedido', 1), ('Checkout', 2), ('Cancelar', 3), ('Histórico da Nota Fiscal', 4), ('Titulo', 5), ('Recebimento TEL', 6)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Consórcio
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consórcio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Títulos', 0), ('Incluir', 1), ('Alterar', 2), ('Cancelar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Atendimento > Revisão na Medida
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Revisão na Medida' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('%Desconto', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Comercialização
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comercialização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo')) AS pai(id)
CROSS JOIN (VALUES ('Proposta Veículo', 0), ('Simula Venda', 1), ('Custo', 2), ('Reserva - Autorizar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Logística > Solicitação Preparação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Solicitação Preparação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Logística' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Trocar Vendedor', 0), ('Trocar Concessionária', 1), ('Limpar Vendedor', 2), ('Limpar Concessionária', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Estoque > RENAVE > Cancela registro no RENAVE
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cancela registro no RENAVE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RENAVE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo')))) AS pai(id)
CROSS JOIN (VALUES ('Permitir liberação de saída Renave', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Nota Fiscal > Autorização de Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autorização de Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar a Requisição', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Título a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Título a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Movimento', 0), ('Pag. Eletrônico', 1), ('Cartão', 2), ('Ocorrência Bancária', 3), ('Ocorrência', 4), ('Prorrogação', 5), ('Rastreabilidade', 6), ('Rateio', 7), ('Fatura', 8), ('Recorrência', 9), ('Cancelar', 10), ('Transferência do Credor', 11), ('Atualiza Total', 12), ('Pagamento Eletrônico', 13), ('Altera Agente Cobrador', 14), ('Altera Tipo Cobrança', 15), ('Documentos', 16), ('Incluir', 17), ('Alterar', 18)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Ficha Razão a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Negociação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Negociação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Faturas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Faturas > Faturas Pendentes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas Pendentes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Faturas > Faturas Emitidas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas Emitidas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Manutenção de Título
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção de Título' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Emissão de Duplicata
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Emissão de Duplicata' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Cancelamento de Baixa Automática
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cancelamento de Baixa Automática' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Provisão para Devedores Duvidosos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Provisão para Devedores Duvidosos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Recalcular Nosso Número
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recalcular Nosso Número' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Cobrança Automática
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cobrança Automática' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Receber > Títulos e Boletos Avulso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos e Boletos Avulso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Título a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Título a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Movimento', 0), ('Pagamento Eletrônico', 1), ('Cartão', 2), ('Ocorrência Bancária', 3), ('Ocorrência', 4), ('Prorrogação', 5), ('Rastreabilidade', 6), ('Rateio', 7), ('Fatura', 8), ('Recorrência', 9), ('Cancelar', 10), ('Transferência do Credor', 11), ('Atualiza Total', 12), ('Altera Agente Cobrador', 13), ('Altera Tipo Cobrança', 14), ('Documentos', 15), ('Incluir', 16), ('Alterar', 17)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Ficha Razão a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > DDA
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DDA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Faturas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Cancelar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Titulo Autoriza pagamento eletrônico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Titulo Autoriza pagamento eletrônico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Fatura de Tributos Retidos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fatura de Tributos Retidos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Manutenção de Título
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção de Título' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Faturas (*)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas (*)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Baixa Automática
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Baixa Automática' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Cancelamento de Baixa Automática
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cancelamento de Baixa Automática' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Contas a Pagar > Veículos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Pagamento e Transferência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamento e Transferência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Recibos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recibos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Impressão', 0), ('Reimpressão', 1), ('Cancelar', 2), ('Incluir', 3), ('Alterar', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Lançamentos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lançamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Permite desconciliar', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Lançamentos (*)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lançamentos (*)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Negociação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Negociação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > TEF Externo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='TEF Externo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Log Mobile TEF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Log Mobile TEF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Link TEF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Link TEF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Tesouraria > Notas Fiscais da Reforma Tributária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Notas Fiscais da Reforma Tributária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Encontro de Contas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Encontro de Contas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Orçamento para Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Orçamento para Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Emissão de Duplicata
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Emissão de Duplicata' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Emissão de Boleto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Emissão de Boleto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Gerar', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Análise de Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Análise de Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Emissão de PIX
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Emissão de PIX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Remessa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Remessa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Remessa > Cobrança
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Remessa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Remessa > Pagamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Remessa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > IntBan
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IntBan' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > IntBan > Monitor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IntBan' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Depósito Identificado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Depósito Identificado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Pagamento Eletrônico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamento Eletrônico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Cartão de Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cartão de Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Cartão Conciliação de Vendas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cartão Conciliação de Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > PIX
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='PIX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Cheques em Custódia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cheques em Custódia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Cobrança
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > DDA
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DDA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Comunicação Bancária > Retorno > Extrato Bancário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Extrato Bancário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação Bancária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Autorizar', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Pagamentos Pendentes na Tesouraria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamentos Pendentes na Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Posição Analítica de Títulos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Analítica de Títulos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Diário Auxiliar a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Diário Auxiliar a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Currículo de Pagamentos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Currículo de Pagamentos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Ficha Razão Devedores Diversos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão Devedores Diversos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Posição Sintética Títulos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Sintética Títulos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Previsão de Pagamento Sintético
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Previsão de Pagamento Sintético' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Previsão de Pagamento Analítico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Previsão de Pagamento Analítico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Resumo Geral de Títulos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo Geral de Títulos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Títulos Emitidos a Pagar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos Emitidos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Pagar > Títulos em Atraso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos em Atraso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Títulos Recebidos no Período
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos Recebidos no Período' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Títulos em Atraso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos em Atraso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Pedidos Pendentes de Recebimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pedidos Pendentes de Recebimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Posição Analítica de Títulos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Analítica de Títulos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Diário Auxiliar a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Diário Auxiliar a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Currículo de Pagamentos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Currículo de Pagamentos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Ficha Razão Credores Diversos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão Credores Diversos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Posição Sintética Títulos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Sintética Títulos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Previsão de Recebimento Sintético
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Previsão de Recebimento Sintético' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Previsão de Recebimento Analítico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Previsão de Recebimento Analítico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Resumo Geral de Títulos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo Geral de Títulos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Títulos Emitidos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos Emitidos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Notas Fiscais a Faturar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Notas Fiscais a Faturar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Análise de Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Análise de Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Análise de Tarifas Bancárias
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Análise de Tarifas Bancárias' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Limite de Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Limite de Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber > Carta de Liberação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Carta de Liberação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Cheques Emitidos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cheques Emitidos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Cópia de Cheque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cópia de Cheque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Notas Fiscais Pendentes de Recebimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Notas Fiscais Pendentes de Recebimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Resumo do Movimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo do Movimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Extrato de Conta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Extrato de Conta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Fluxo de Caixa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fluxo de Caixa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Fechamento de Caixa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fechamento de Caixa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Saldo de Créditos Não Identificados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Saldo de Créditos Não Identificados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Total de Nota Fiscal Emitidas por Condição de Pagamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Total de Nota Fiscal Emitidas por Condição de Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Pagamentos e Recebimentos por Conta Gerencial e Valor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamentos e Recebimentos por Conta Gerencial e Valor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Tesouraria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Demonstrativo de Resultados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Demonstrativo de Resultados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Créditos Baixados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Créditos Baixados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Inativo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Inativo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Previsão de Pagamento/Recebimento Analítico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Previsão de Pagamento/Recebimento Analítico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Posição Analítica Títulos a Pagar/Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Analítica Títulos a Pagar/Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Posição Sintética Títulos a Pagar/Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Sintética Títulos a Pagar/Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Resumo Geral de Títulos a Pagar/Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo Geral de Títulos a Pagar/Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Currículo de Pagamentos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Currículo de Pagamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Ficha Razão Extrato
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão Extrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Tesouraria > Ficha Razão Saldo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ficha Razão Saldo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Títulos Emitidos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos Emitidos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Totais Pagos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Totais Pagos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Crédito / Débito Títulos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crédito / Débito Títulos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Totais Pagos > Por Credor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Por Credor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Totais Pagos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Totais Pagos > Por Credor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Por Credor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Totais Pagos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Totais Pagos > Por Item de Despesa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Por Item de Despesa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Totais Pagos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Crédito / Débito Títulos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crédito / Débito Títulos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Pagamento Eletrônico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pagamento Eletrônico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Situação de Recebimento TEF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Situação de Recebimento TEF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF > Comunicação ao COAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comunicação ao COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF > Registro das Operações
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Registro das Operações' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF > Registro da Comunicação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Registro da Comunicação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Resolução COAF > Importação > Lista PEP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista PEP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resolução COAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Plano de Contas Gerenciais
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Plano de Contas Gerenciais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Zerar Limite de Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Zerar Limite de Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Agendamento > Consulta Agendamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Permite Tempo Adicional', 1), ('Consultar Agendamento Ford', 2), ('Inclusão', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Agendamento > Quadro Agendamento Produtivo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Quadro Agendamento Produtivo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Permite Tempo Adicional', 1), ('Consultar Agendamento Ford', 2), ('Inclusão', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Agendamento > Consulta Agendamento Diário por Região
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta Agendamento Diário por Região' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Agendar Serviço em Hora Extra', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Consultas > Consulta de Requisição de Compras
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta de Requisição de Compras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consultas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Itens da Requisição de compra (Produtos)', 0), ('Solicitar Autorização', 1), ('Cancelar a Requisição', 2), ('Desfazer o Cancelamento', 3), ('Imprimir Requisição de Compra', 4), ('Desvincular O.S', 5), ('Grid - Imprimir', 6)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Consultas > Consulta Requisição Entregas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta Requisição Entregas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consultas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Confirma Entrega', 0), ('Solicita 2a Via', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Ordem de Serviço/Orçamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ordem de Serviço/Orçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('Encerrar Tipo de OS', 0), ('Emitir Nota Fiscal', 1), ('Emitir Pré Nota', 2), ('Cancelar Tipo de OS', 3), ('Listar Marcação Executada na OS', 4), ('Transferir para outro Tipo de OS', 5), ('Solicitar Aprovação', 6), ('Autorizar Execução de Serviços e Produtos', 7), ('Desautorizar Execução de Serviços e Produtos', 8), ('Iniciar/Parar Serviço', 9), ('Reabrir Serviço', 10), ('Requisitar Produtos', 11), ('Cancelar Requisição dos Produtos', 12), ('Seguradora', 13), ('Informações', 14), ('Pertences', 15), ('Vistoria', 16), ('Entrega do Veículo', 17), ('Marcação', 18), ('Ocorrência', 19), ('E-mail', 20), ('SMS', 21), ('Cancelar Nota Fiscal', 22), ('Cortesia', 23), ('Definir Produtivo', 24), ('Desvincular Notas', 25), ('Substituir T.M.O. na O.S.', 26), ('Substituir Veículo da O.S.', 27), ('Reabrir tipo da O.S.', 28), ('Alterar Valor Produto no Serviço', 29), ('Definir Consultor', 30), ('Permitir Alteração da Programação do Produtivo', 31), ('Imprimir Pré-Requisição', 32), ('Inserir OS', 33), ('Confirmar Entrega do Veículo', 34), ('Exibir Detalhe de Margem', 35), ('Bloquear Alteração do Valor do Serviço', 36), ('Atualizar Tempo do Serviço', 37), ('Gerar NF de Saída e Entrada (Remessa)', 38), ('Habilitar Hora do Serviço', 39), ('Habilitar Flag Executar Serviço', 40), ('Transferir produtos para outro T.M.O.', 41), ('Permite Alterar Data de Abertura da OS', 42), ('Imprimir OS', 43), ('Campanha', 44), ('Comprovante Recall', 45), ('Foto', 46), ('Informações Adicionais de Garantia', 47), ('Serviços Adicionais', 48), ('Motorista', 49), ('Local Realização', 50), ('Imprimir Etiqueta de Serviços', 51), ('Adiantamento', 52), ('Consulta HSV', 53), ('Consulta ICM', 54), ('Alerta Garantia(FIAT)', 55), ('Histórico da OS', 56), ('Ficha de Seguimento', 57), ('Integração', 58), ('Imprimir CheckList', 59), ('ElsaPro (VW)', 60), ('Pacote Fechado (RENAULT)', 61), ('Ficha de Acompanhamento', 62), ('Documento', 63), ('Incluir Novo Item na OS', 64), ('Consulta Recall Honda', 65), ('Alterar Marcação de Tempo na OS', 66), ('Excluir Marcação de Tempo na OS', 67), ('Desfazer Entrega Veículo', 68), ('Associar o Cliente como Proprietário do Veículo', 69), ('NF Garantia Estendida', 70), ('Limite Máximo Tipo de OS', 71), ('Alterar Tipo de OS no Orçamento', 72), ('Bloquear Campo Quantidade', 73), ('Alterar Diagnóstico', 74), ('Excluir Diagnóstico', 75)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > RAC
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RAC' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('Altera Histórico', 0), ('Excluir Histórico', 1), ('Imprimir RAC', 2), ('Alterar Responsável RAC', 3), ('Exportar RAC', 4), ('Bloquear Alteração de Descrição do RAC', 5), ('Alterar RAC', 6), ('Excluir RAC', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Portaria > Controle da Portaria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Controle da Portaria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Portaria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Desfazer Liberação', 0), ('Histórico', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Pesquisas de Pós-Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisas de Pós-Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('Consultar Pesquisa', 0), ('Efetuar Pesquisa', 1), ('Imprimir Pesquisa', 2), ('Histórico', 3), ('Cancelar Pesquisa', 4), ('Reabrir Pesquisa', 5), ('Exportar Pesquisa', 6)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Nota Fiscal > NF Entrada da Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Entrada da Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observação NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Altera Tributo', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Incluir', 21), ('Alterar', 22)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Nota Fiscal > NF Saída Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Saída Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Imprimir', 2), ('Alterar NF', 3), ('Rateio NF', 4), ('Rodapé NF', 5), ('Parcela NF', 6), ('Tributo NF', 7), ('Observação NF', 8), ('Documento Dinâmico NF', 9), ('Histórico NF', 10), ('Confirmar NF', 11), ('Imprimir NF', 12), ('Alterar Rateio NF', 13), ('Deletar Rateio NF', 14), ('Inserir Rateio NF', 15), ('Rateio Padrão NF', 16), ('Rateio NF / Inserir / Confirmar', 17), ('Rateio NF / Rateio Padrão / Confirmar', 18), ('Altera Tributo', 19), ('Excluir Tributo', 20), ('Incluir', 21), ('Alterar', 22)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Relatórios > Comissão da Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comissão da Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Habilitar Opção Outros Perfis', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Requisitar Produto da OS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Requisitar Produto da OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('Autorizar Execução de Serviços e Produtos', 0), ('Requisitar Produtos', 1), ('Cancelar Requisição dos Produtos', 2), ('Transferir Produtos', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Marcação de Tempo da OS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Marcação de Tempo da OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('Alterar Marcação', 0), ('Marcação', 1), ('Rateio', 2), ('Ocorrências', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Marcação de Tempo da OS > Marcação de Tempo Manual
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Marcação de Tempo Manual' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Marcação de Tempo da OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina'))) AS pai(id)
CROSS JOIN (VALUES ('Alterar Marcação', 0), ('Marcação', 1), ('Rateio', 2), ('Ocorrências', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Oficina > Revisão Pré-Paga
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Revisão Pré-Paga' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Oficina')) AS pai(id)
CROSS JOIN (VALUES ('WP_RevisaoNaMedidaDesconto', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Localização do Produto no Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Localização do Produto no Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Alterar Localização', 0), ('Modificar', 1), ('Incluir', 2), ('Eliminar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Promoções
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Promoções' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Produto', 0), ('Autorizar', 1), ('Desautorizar', 2), ('Cancelar', 3), ('Reabrir', 4), ('Reativar', 5), ('Finalizar', 6), ('Incluir', 7), ('Alterar', 8), ('Excluir', 9)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Bloqueio de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bloqueio de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto > Exportação > Peças On-line
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças On-line' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Compras > Requisição de Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Requisição de Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Compras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Itens da Requisição de compra (Produtos)', 0), ('Solicitar Autorização', 1), ('Cancelar a Requisição', 2), ('Desfazer o Cancelamento', 3), ('Imprimir Requisição de Compra', 4), ('Desvincular O.S', 5), ('Grid - Imprimir', 6), ('Documentos', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Compras > Pedido de Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pedido de Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Compras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Itens', 0), ('Prorrogar', 1), ('CheckOut', 2), ('Reabrir', 3), ('Requisições Atendidas', 4), ('Cancelar', 5), ('Imprimir', 6), ('Exportar', 7), ('Adicionar Item Sem Requisição', 8), ('Documentos', 9), ('Incluir', 10), ('Alterar', 11), ('Alterar/Excluir Documento (Botão Documentos)', 12)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Compras > Sugestão de Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Sugestão de Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Compras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Filtro Seleção', 0), ('Processar Sugestão de Compra', 1), ('Produto', 2), ('Imprimir Sugestão de Compra', 3), ('Gerar Pedidos de Compra', 4), ('Modificar Sugestão', 5), ('Cancelar Sugestão', 6), ('Incluir', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Compras > Requisição de Compra por Fornecedor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Requisição de Compra por Fornecedor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Compras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Imprimir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Movimento de Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Movimento de Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Imprimir', 0), ('Alterar', 1), ('Cancelar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Lista de Separação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Separação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Mostrar', 0), ('Entregar/Receber', 1), ('Reimprimir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Markup de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Markup de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Classificação ABC > Cálculo ABC Popularidade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cálculo ABC Popularidade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação ABC' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Horário Agendamento Fluxo', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Vendas Balcão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas Balcão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Margem', 0), ('Imprime Orçamento', 1), ('Preço Garantia', 2), ('Preço Sugerido', 3), ('Custo Médio', 4), ('Prorrogar Pedido', 5), ('CheckOut', 6), ('% de Comissão Intermediário', 7), ('Alterar Telefone e E-mail', 8), ('Controle Entrega', 9), ('Finalizar', 10), ('Reabrir', 11), ('Alterar Vendedor', 12), ('Visualizar Pedidos Externos', 13), ('Gerar Lista de Separação', 14), ('Cancelar', 15), ('Alterar Preço Unitário (Após Config Nat Operação)', 16), ('Custo Real Não Ajustado', 17), ('Custo Médio Ajustado', 18), ('Desconto Aplicado', 19), ('Imprime Nota Fiscal', 20), ('Imprime Ficha do Cliente', 21)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Política de Descontos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Política de Descontos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Regras', 0), ('Autorizar', 1), ('Desautorizar', 2), ('Cancelar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Vendas Balcão v2.0
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas Balcão v2.0' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Margem', 0), ('Imprime Orçamento', 1), ('Preço Garantia', 2), ('Preço Sugerido', 3), ('Custo Médio', 4), ('Prorrogar Pedido', 5), ('CheckOut', 6), ('% de Comissão Intermediário', 7), ('Alterar Telefone e E-mail', 8), ('Controle Entrega', 9), ('Finalizar', 10), ('Reabrir', 11), ('Alterar Vendedor', 12), ('Visualizar Pedidos Externos', 13), ('Gerar Lista de Separação', 14), ('Cancelar', 15), ('Alterar Preço Unitário (Após Config Nat Operação)', 16), ('Custo Real Não Ajustado', 17), ('Custo Médio Ajustado', 18), ('Desconto Aplicado', 19), ('Imprime Nota Fiscal', 20), ('Imprime Ficha do Cliente', 21)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Transferência de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Transferência de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Produto', 0), ('Transferir', 1), ('Cancelar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > Romaneio Entrada
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Romaneio Entrada' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Alterar', 0), ('Cancelar', 1), ('Volume', 2), ('Reclamação', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > Recebimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recebimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Recebimento', 0), ('Reclamação', 1), ('Finalizar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > NF Saída Transferência Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Saída Transferência Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Rateio NF', 0), ('Rodapé NF', 1), ('Parcela NF', 2), ('Tributo NF', 3), ('Observação NF', 4), ('Documento Dinâmico NF', 5), ('Histórico NF', 6), ('Confirmar NF', 7), ('Imprimir NF', 8), ('Alterar Rateio NF', 9), ('Deletar Rateio NF', 10), ('Inserir Rateio NF', 11), ('Rateio Padrão NF', 12), ('Rateio NF / Inserir / Confirmar', 13), ('Rateio NF / Rateio Padrão / Confirmar', 14)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > NF Entrada Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Entrada Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observacao NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Unificar Pedido de Compra', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Desvincular Nota Fiscal de Frete', 21), ('Observação NF', 22), ('Incluir', 23), ('Alterar', 24)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > NF Saída Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Saída Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observacao NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Alterar Tributo', 18), ('Nota Fiscal Conta e Ordem', 19), ('Descancelar', 20), ('Grupo de Movimento Venda', 21), ('Desvincular Nota Fiscal de Frete', 22), ('Observação NF', 23), ('Incluir', 24), ('Alterar', 25)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > NF Entrada Item Avulso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Entrada Item Avulso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observacao NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Alterar Tributo', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Desvincular Nota Fiscal de Frete', 21), ('Observação NF', 22), ('Incluir', 23), ('Alterar', 24)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > NF Saída Item Avulso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NF Saída Item Avulso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Cancelar', 0), ('Devolução', 1), ('Alterar NF', 2), ('Rateio NF', 3), ('Rodapé NF', 4), ('Parcela NF', 5), ('Tributo NF', 6), ('Observacao NF', 7), ('Documento Dinâmico NF', 8), ('Histórico NF', 9), ('Confirmar NF', 10), ('Imprimir NF', 11), ('Alterar Rateio NF', 12), ('Deletar Rateio NF', 13), ('Inserir Rateio NF', 14), ('Rateio Padrão NF', 15), ('Rateio NF / Inserir / Confirmar', 16), ('Rateio NF / Rateio Padrão / Confirmar', 17), ('Alterar Tributo', 18), ('Excluir Tributo', 19), ('Descancelar', 20), ('Manutenção da Comissão de VD', 21), ('Desvincular Nota Fiscal de Frete', 22), ('Observação NF', 23), ('Incluir', 24), ('Alterar', 25)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Nota Fiscal > Recebimento Via Leitor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Recebimento Via Leitor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos'))) AS pai(id)
CROSS JOIN (VALUES ('Recebimento', 0), ('Reclamação', 1), ('Finalizar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Estoque de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Preço Público', 0), ('Preço Reposição', 1), ('Preço Garantia', 2), ('Preço Sugerido', 3), ('Custo Médio', 4), ('Manutenção Preços', 5), ('Localização', 6), ('Preço Reposição Subst. Trib.', 7), ('Histórico de Preço', 8), ('Manutenção Preço Marca', 9), ('Manutenção Letra', 10), ('Bloqueio Produto - Excluir', 11)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Vendas Externas de Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas Externas de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Consultar', 0), ('Atendimento', 1), ('Agendar', 2), ('Pedido', 3), ('Transferir', 4), ('Agenda', 5), ('Desvincular', 6), ('Monitor', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Pedidos Pendentes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pedidos Pendentes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')) AS pai(id)
CROSS JOIN (VALUES ('Autorização Financeiro', 0), ('Ver Carrinho', 1), ('Cancelar Pedido', 2), ('Prorrogação do Pedido', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Relatórios > Estoque > Inventário Geral
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Inventário Geral' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')))) AS pai(id)
CROSS JOIN (VALUES ('Reprocessar', 0), ('Imprimir', 1), ('Apagar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Produtos > Relatórios > Vendas > Comissão de Vendedores de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comissão de Vendedores de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Produtos')))) AS pai(id)
CROSS JOIN (VALUES ('Filtro Vendedor', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Escrita Fiscal > Saldo Credor/Devedor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Saldo Credor/Devedor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Escrita Fiscal')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Escrita Fiscal > Relatórios > Estaduais > Mapa Resumo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Mapa Resumo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estaduais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Escrita Fiscal')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Exportação > SPED
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SPED' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Administração > Segurança > Usuário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Usuário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Segurança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Administração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Administração > Empresarial > Departamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Departamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Empresarial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Administração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Administração > Empresarial > Fechamento Contábil
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fechamento Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Empresarial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Administração'))) AS pai(id)
CROSS JOIN (VALUES ('Configuração', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Integração
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Integração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Layout
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Layout' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Arquivo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Arquivo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Tabela
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabela' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Campo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Campo Default
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campo Default' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Importar e Exportar XML
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar e Exportar XML' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > De Para
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='De Para' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Monitor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > De Para OPV
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='De Para OPV' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Exportação de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Cadastro > Exportação de Clientes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação de Clientes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Contábil
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Contábil > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Contábil > Exportação > Notas Fiscais
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Notas Fiscais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Financeiro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Financeiro > Importação > Floor Plan
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Floor Plan' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Financeiro > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > Importação > Cardápio de Serviços
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cardápio de Serviços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > Importação > Importação TABMEC.ZIP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação TABMEC.ZIP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > Importação > Importação TABMEC.ZIP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação TABMEC.ZIP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > Importação > Inconvenientes x Anomalias
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Inconvenientes x Anomalias' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > Exportação > CSI Pós-Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CSI Pós-Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > IntCampanhas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IntCampanhas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Oficina > IntCampanhas > Quadro IntCampanhas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Quadro IntCampanhas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IntCampanhas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Crítica do Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crítica do Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto > Exportação > Peças On-line
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças On-line' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Atualização da Descrição de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atualização da Descrição de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Estoque Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Estoque Peças - Estatísticas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque Peças - Estatísticas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Peças Para Internet
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças Para Internet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Nota Fiscal Recompra Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Recompra Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Estoque de Peças - MPS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque de Peças - MPS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Peças em BO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças em BO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Importação Peças DUCATO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação Peças DUCATO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Promoção de Produtos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Promoção de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > DSO - Detalhamento NF Sell Out
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DSO - Detalhamento NF Sell Out' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Importação > Produto Intercambiável (DESALTER)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto Intercambiável (DESALTER)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Produto > Exportação > Prim Certification
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prim Certification' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Corsia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Corsia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > NCM de Veículos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NCM de Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Faturamento de Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturamento de Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Lista de Preço de Veículos/Opcionais
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Preço de Veículos/Opcionais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Exportação > Comprovante de Entrega
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comprovante de Entrega' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Exportação > Análise Qualitativa/Quantitativa do Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Análise Qualitativa/Quantitativa do Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Tabela Molicar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabela Molicar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Exportação > Veiculos TWG
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veiculos TWG' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Peças Aplicadas por Modelo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças Aplicadas por Modelo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Bônus de Fábrica/Venda de Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bônus de Fábrica/Venda de Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Baixa de Títulos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Baixa de Títulos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Total Fleet
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Total Fleet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Lançamentos Bônus Equalização - SBE
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lançamentos Bônus Equalização - SBE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Sistema de Crédito de Bônus
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Sistema de Crédito de Bônus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Importação > Carta Bônus de Fábrica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Carta Bônus de Fábrica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Veículo > Exportação > Total Fleet
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Total Fleet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Care
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Care' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Care > Exportar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Care' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Care > Importar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Care' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Exportação > R.E.V.P.
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='R.E.V.P.' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Exportação > Nota Fiscal de Transporte
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal de Transporte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Exportação > Solicitação de Autorização de Garantia - B2B
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Solicitação de Autorização de Garantia - B2B' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Exportação > Exportação E-Gate
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação E-Gate' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Espelho da NF de Transporte
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Espelho da NF de Transporte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Retorno de R.E.V.P.
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno de R.E.V.P.' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Autorização - B2B
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autorização - B2B' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Aceite
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Aceite' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Estorno
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estorno' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Importar SG´s Pendentes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar SG´s Pendentes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Importação > Comissão MVP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Comissão MVP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FIAT - CJDR > Garantia > Redigitação de Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Redigitação de Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Oficina > Importação > Pacotes (Kits)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pacotes (Kits)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Oficina > Exportação > Indicadores (OFIC4900)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Indicadores (OFIC4900)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Oficina > Exportação > Tipo OS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Produto > Importação > Faturamento de Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturamento de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Produto > Importação > Tabela de Substituição - TABSUBST
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabela de Substituição - TABSUBST' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Veículo > Importação > Preço de Modelos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Preço de Modelos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Veículo > Importação > Preço de Opcionais
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Preço de Opcionais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Peugeot > Veículo > Importação > Arquivo AR
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Arquivo AR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peugeot' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Nota Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > XML - Importação > Nota Fiscal de Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal de Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='XML - Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > XML - Importação > Nota Fiscal de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='XML - Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Considerar Regras dos Tributos', 0), ('Unificar Pedido de Compra', 1), ('Alterar produto', 2), ('Alterar NCM', 3), ('Importação de XML', 4), ('Considerar Somente PIS/COFINS Pelas Regras dos Tributos', 5), ('Incluir', 6), ('Alterar', 7), ('Excluir', 8)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > XML - Importação > Nota Fiscal de Item Avulso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal de Item Avulso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='XML - Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Considerar Regras dos Tributos', 0), ('Considerar Somente PIS/COFINS Pelas Regras dos Tributos', 1), ('Incluir', 2), ('Alterar', 3), ('Excluir', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > XML - Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='XML - Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Posição Financeira > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Posição Financeira > Exportação > PEF FIAT - CJDR
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='PEF FIAT - CJDR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Posição Financeira > Exportação > PEF-ABRACAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='PEF-ABRACAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Posição Financeira > Layout / Bloqueio
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Layout / Bloqueio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Oficina > Exportação > Envio de O.S.
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Envio de O.S.' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Produto > Importação > Arquivo Nota Fiscal ABCNet
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Arquivo Nota Fiscal ABCNet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Veiculo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veiculo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Veiculo > Contrato OPV
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contrato OPV' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veiculo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Citroën > Veiculo > Modelo e Família
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Modelo e Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veiculo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Citroën' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto > Importação > Lista de Preços
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Preços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto > Importação > N.C.M.
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='N.C.M.' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Produto > Importação > Lista de Preços por xls
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Preços por xls' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Cancelamento de Vendas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cancelamento de Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Veículos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Pessoas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pessoas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Agendamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Vendas de Veículos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas de Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Vendas de Servicos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas de Servicos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Peças Vendidas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Peças Vendidas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Grupo de Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Orçamento de Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Orçamento de Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Orçamento de Peça
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Orçamento de Peça' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Pos Venda Peça
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pos Venda Peça' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Exportação > Pos Venda NF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pos Venda NF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > IBOPE dtm > Importação > Pessoas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pessoas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBOPE dtm' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > MasterSAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MasterSAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > MasterSAF > Cupom Fiscal (Arquivos SAFX)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cupom Fiscal (Arquivos SAFX)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MasterSAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > MasterSAF > Exportação (Arquivos SAFX)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação (Arquivos SAFX)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MasterSAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > MasterSAF > Tabelas (Arquivos SAFX)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabelas (Arquivos SAFX)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MasterSAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > SAP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > SAP > Sincronizacao
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Sincronizacao' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Cliente', 0), ('Contábil', 1), ('Contas a Pagar', 2), ('Contas a Receber', 3), ('Fechamento de Caixa', 4), ('Fornecedor', 5), ('Oficina Garantia', 6), ('Oficina Garantia Espelho', 7), ('Pedido Compra', 8), ('Recebimento', 9), ('Registro Vendas', 10), ('Exportação de Revisão', 11), ('Scrap Pecas', 12), ('Enviar', 13), ('Incluir', 14), ('Alterar', 15), ('Excluir', 16)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > SAP > Conferência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conferência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > SAP > Protheus
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Protheus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > HMB
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > HMB > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > HMB > Consultar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consultar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > HMB > Consultar > Estoque e Faturamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estoque e Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consultar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Autoware
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autoware' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Indicador KPI
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Indicador KPI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > Autoware > Importação Dados de Terceiros Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação Dados de Terceiros Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autoware' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Pesquisa - Amaro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa - Amaro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Pesquisa - Amaro > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa - Amaro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Pesquisa - Amaro > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa - Amaro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Pesquisa - Hyundai
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa - Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Monitor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > BBOX
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='BBOX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > BBOX > Importação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='BBOX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Oficina > Importação > Kit
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Kit' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Oficina > Importação > Contrato
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Produto > Atualiza Pedido BIR.PAR
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atualiza Pedido BIR.PAR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Veículos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Veículos > Reenvio Salesforce Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reenvio Salesforce Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Renault > Veículos > Reenvio Salesforce Proposta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reenvio Salesforce Proposta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Renault' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD > Monitor Ford
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitor Ford' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD > MKLS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MKLS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD > Produto > Importação > Faturas de Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faturas de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > FORD > Service Transformation
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Service Transformation' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='FORD' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > DAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > DAF > Integração MDI
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Integração MDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Terceiros > Pesquisa - Hyundai > HMB > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa - Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Terceiros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > MarketPlace
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MarketPlace' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > MarketPlace > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='MarketPlace' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Royal Enfield
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Royal Enfield' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Royal Enfield > Parâmetros
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Royal Enfield' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > DAF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > DAF > Integração MDI
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Integração MDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > DAF > Integração Focus
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Integração Focus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Subaru
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Subaru' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Subaru > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Subaru' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > IVECO > Produto > Exportação > RMPV
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RMPV' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IVECO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > IVECO > Oficina > Importar > Campanhas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanhas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IVECO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > IVECO > Produto > Importar > Nota Fiscal Entrada de Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Entrada de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IVECO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Subaru > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Subaru' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > IVECO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IVECO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Intelligent Supply
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Intelligent Supply' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Prim
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prim' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Prim > CNH
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CNH' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prim' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Prim > Situação de Pedidos de Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Situação de Pedidos de Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prim' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Prim > Relatório PRIM Err
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatório PRIM Err' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Prim' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Clark
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Clark' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Clark > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Clark' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > CNH
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CNH' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > CNH > Exportação BMS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação BMS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CNH' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Cadastro e Atualização de Preço de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de Preço de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Pesquisa Pós-Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa Pós-Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Pesquisa Pós-Venda > Exportação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa Pós-Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Autoware
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Autoware' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Lista de Preços
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Preços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Chery > Importação TMO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação TMO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Chery' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Troller
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Troller' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Troller > Cadastro e Atualização de Preço de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de Preço de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Troller' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Troller > Cadastro e Atualização de TMO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de TMO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Troller' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Yamaha
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Yamaha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Yamaha > Cadastro e Atualização de Preço de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de Preço de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Yamaha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > JCB Tratores
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='JCB Tratores' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > JCB Tratores > Cadastro e Atualização de Preço de Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de Preço de Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='JCB Tratores' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Volks
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Volks' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Volks > RMS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RMS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Volks' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Volks > Correção PPSO - Pacotes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Correção PPSO - Pacotes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Volks' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Atendimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Monitoramento de Preço(PROD4000)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitoramento de Preço(PROD4000)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Politica Estocagem(PEDT5000)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Politica Estocagem(PEDT5000)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Manutenção Locações(PEDC6000)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção Locações(PEDC6000)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Relatório de Itens Curva AJ (PEDT3020)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatório de Itens Curva AJ (PEDT3020)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Análise de Produtividade/Eficiência (OFIT9320)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Análise de Produtividade/Eficiência (OFIT9320)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Spdp Download NF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Spdp Download NF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > S/R – Atendimento Imediato (PEDT0801)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='S/R – Atendimento Imediato (PEDT0801)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Relatório de Verbalização
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatório de Verbalização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > KPI Revisão Expressa (OFIT0100)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='KPI Revisão Expressa (OFIT0100)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Clientes Atendidos na Oficina (OFIC7920)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Clientes Atendidos na Oficina (OFIC7920)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Registro APS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Registro APS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Reserva de Peças Especiais (OFIT0375)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reserva de Peças Especiais (OFIT0375)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Cliente Agendados (OFIC0376)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cliente Agendados (OFIC0376)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Oficina > Estratificação das Passagens
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estratificação das Passagens' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Sppr Pacote Servico Importar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Sppr Pacote Servico Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Quadro - Indicadores De Gerenciamento De Peças - TSM Básico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Quadro - Indicadores De Gerenciamento De Peças - TSM Básico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Gráfico Taxa de Serviço (OFIT0790)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Gráfico Taxa de Serviço (OFIT0790)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Classe Especial Controle SCC (CADA0670)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classe Especial Controle SCC (CADA0670)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Itens por Locação (PEDC3100)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Itens por Locação (PEDC3100)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Relatorio > Produto > Estudo de Dias de Estoque (OFIC0730)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estudo de Dias de Estoque (OFIC0730)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatorio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Financeiro > Importação Extrato Conciliação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação Extrato Conciliação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Emplacamento/Entrega de Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Emplacamento/Entrega de Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > TMO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='TMO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Baixa de Crédito Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Baixa de Crédito Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Toyota > Reenviar SGMP/HSV
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reenviar SGMP/HSV' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > AUDI
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='AUDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > AUDI > Informações Adicionais
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Informações Adicionais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='AUDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > AUDI > RMS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RMS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='AUDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > AUDI > Correção PPSO - Pacotes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Correção PPSO - Pacotes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='AUDI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > NISSAN
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > NISSAN > SERNISSAN
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SERNISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > NISSAN > SERNISSAN > Funil de Serviços
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Funil de Serviços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SERNISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > NISSAN > SERNISSAN > Painel de Monitoramento de Serviços e Satisfação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Painel de Monitoramento de Serviços e Satisfação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SERNISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > NISSAN > Confirmação do Agendamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Confirmação do Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NISSAN' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Confirmar Agendamento', 0), ('Configuração de Intervalo', 1), ('Incluir', 2), ('Alterar', 3), ('Excluir', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Dynapac
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dynapac' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Dynapac > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dynapac' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Multimarcas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Multimarcas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Multimarcas > Still
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Still' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Multimarcas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Multimarcas > Still > Importar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Still' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Multimarcas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > SAP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > SAP > Configuração > Tributo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tributo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configuração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > SAP > Carga Inicial
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Carga Inicial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SAP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > GM/Chevrolet
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='GM/Chevrolet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > GM/Chevrolet > Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='GM/Chevrolet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > GM/Chevrolet > Garantia > Exportação > Informações Diárias de Peças
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Informações Diárias de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='GM/Chevrolet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > GM/Chevrolet > Garantia > Exportação > Av. de Vendas/Cancelamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Av. de Vendas/Cancelamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='GM/Chevrolet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Scania
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Scania' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Scania > Produto
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Scania' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Scania > Produto > Importar > Cadastro e Atualização de Produtos e Preços
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro e Atualização de Produtos e Preços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Scania' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Scania > Produto > Exportar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Scania' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Scania > Produto > Exportar > Sugestão de Estoque Padrão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Sugestão de Estoque Padrão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Scania' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios') AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Carregar Relatório
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Carregar Relatório' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Mala Direta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Mala Direta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Relatórios
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Relatórios > ConferenciaEntradaNF (3)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='ConferenciaEntradaNF (3)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Relatórios > ConferenciaEntradaNF_DIAGNOSTICO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='ConferenciaEntradaNF_DIAGNOSTICO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Meus Relatórios > Relatórios > ConferenciaEntradaNF
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='ConferenciaEntradaNF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Meus Relatórios'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Campanha CRM
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanha CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado de Campanhas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado de Campanhas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado FUP
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado FUP' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resumo por Mídia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo por Mídia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resumo por Encerramento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo por Encerramento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado Test Drive
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado Test Drive' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resumo da Agenda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo da Agenda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Lista por Data de Contato/Encerramento(Agenda)
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista por Data de Contato/Encerramento(Agenda)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Percentual de Agendamento Ativo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Percentual de Agendamento Ativo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Percentual de Vendas com Perseguição
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Percentual de Vendas com Perseguição' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado Operacional
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado Operacional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Crescimento da Base
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crescimento da Base' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Agendamento da Oficina
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento da Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > E-mail de Clientes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='E-mail de Clientes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado de Campanhas por Operador de Agendamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado de Campanhas por Operador de Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resumo por Meio de Contato
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo por Meio de Contato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resumo por Encaminhamento da Recepção
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resumo por Encaminhamento da Recepção' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Contatos Planejados X Realizados
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contatos Planejados X Realizados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Agendamentos Realizados por Mês
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamentos Realizados por Mês' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Reagendamentos da Oficina Comparecidas por Consultor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reagendamentos da Oficina Comparecidas por Consultor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Veículo de Interesse
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo de Interesse' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Resultado de Pós-Vendas por Operador
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado de Pós-Vendas por Operador' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Relatórios > Vendas Perdidas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas Perdidas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Atendimento - Transferência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento - Transferência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Atendimento/Contatos - Encerramento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atendimento/Contatos - Encerramento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Perfil do Cliente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Perfil do Cliente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Agenda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agenda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Troca Usuário', 0), ('Agendamento', 1), ('Orçamento', 2), ('Ordem de Serviço', 3), ('Atendimento', 4), ('Comercialização', 5), ('Avaliação de Usado', 6), ('Entrega de Veículo', 7), ('Solicitar Avaliação do Veículo', 8), ('Incluir', 9), ('Alterar', 10), ('Excluir', 11)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Show de Entrega
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Show de Entrega' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Meta por Usuário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Meta por Usuário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Pesquisas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Consultar Pesquisa', 0), ('Efetuar Pesquisa', 1), ('Imprimir Pesquisa', 2), ('Histórico', 3), ('Cancelar Pesquisa', 4), ('Incluir', 5), ('Alterar', 6), ('Excluir', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- CRM > Transferência Carteira Cliente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Transferência Carteira Cliente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='CRM')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Cancelamento / Liberação de Lotes
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cancelamento / Liberação de Lotes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade')) AS pai(id)
CROSS JOIN (VALUES ('Libera Lote Contábil', 0), ('Desfazer Liberação', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Consulta de Lançamentos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consulta de Lançamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade')) AS pai(id)
CROSS JOIN (VALUES ('Mostrar', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Manutenção de Lançamentos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção de Lançamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade')) AS pai(id)
CROSS JOIN (VALUES ('Imprimir', 0), ('Importar Lote', 1), ('Liberar Lote', 2), ('Cancelar', 3), ('Mostrar', 4), ('Desfazer Liberação', 5), ('Incluir', 6), ('Alterar', 7)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Contabilização > Conciliação de Estrutura
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conciliação de Estrutura' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))) AS pai(id)
CROSS JOIN (VALUES ('Conciliar', 0), ('Corrigir', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Contabilização > Conciliação de Valores
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Conciliação de Valores' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contabilização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))) AS pai(id)
CROSS JOIN (VALUES ('Processar', 0), ('Conferência', 1), ('Incluir', 2), ('Alterar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Apuração SPED ECF > Bloco M - LALUR / LACS > Parte A - Demonstração do Lucro Real
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Parte A - Demonstração do Lucro Real' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bloco M - LALUR / LACS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Apuração SPED ECF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Apuração SPED ECF > Bloco M - LALUR / LACS > Parte B - Controle das Contas > M010 - Identificação da Conta na Parte B
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='M010 - Identificação da Conta na Parte B' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Parte B - Controle das Contas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bloco M - LALUR / LACS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Apuração SPED ECF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Apuração SPED ECF > Bloco M - LALUR / LACS > Parte B - Controle das Contas > M410 - Lançamento sem reflexo na Parte A
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='M410 - Lançamento sem reflexo na Parte A' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Parte B - Controle das Contas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bloco M - LALUR / LACS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Apuração SPED ECF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Exportação > Exportar Lançamentos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportar Lançamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))) AS pai(id)
CROSS JOIN (VALUES ('Características Vinculadas', 0), ('Incluir', 1), ('Alterar', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Contabilidade > Exportação > Exportar SubConta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportar SubConta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Contabilidade'))) AS pai(id)
CROSS JOIN (VALUES ('Alterar', 0)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Administração > Auditoria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Auditoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Administração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Hyundai > HMB > Consultar
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Consultar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='HMB' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hyundai' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Financeiro > Relatórios > Contas a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Financeiro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Financeiro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Integração > Royal Enfield > Parâmetros
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Royal Enfield' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Integração'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Administração > Auditoria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Auditoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Administração')) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Anomalia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Anomalia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Box
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Box' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Campanha > Campanha
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Campanha > Motivo Cancelamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Cancelamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Campanha > Tipo Campanha
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Campanha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Campanha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Reclamação do Cliente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Reclamação do Cliente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Cor Prisma
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cor Prisma' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Objetivos de Venda/Prospecção
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Objetivos de Venda/Prospecção' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Grupo Kit
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Kit' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem > Imagem Vistoria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem Vistoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Motivo Liberação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Liberação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Motivo Parada
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Parada' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem > Agendamento Imagem Painel
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Agendamento Imagem Painel' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Natureza Defeito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Natureza Defeito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem > Monitor Imagem
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Monitor Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Natureza Defeito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Natureza Defeito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > País
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='País' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Editar', 1), ('Excluir', 2), ('Alterar', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Painel de Imagens
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Painel de Imagens' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Placa Experiência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Placa Experiência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Pesquisa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Pesquisa > Perguntas no Questionário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Perguntas no Questionário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Pesquisa > Questionário
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Questionário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pesquisa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Pertences do Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pertences do Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Estado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > RAC Grupo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='RAC Grupo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Município
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Município' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Serviço Manutenção
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço Manutenção' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Setor Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Setor Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Tipo Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Retorno Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Retorno Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Serviço > Preço Serviço Cliente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Preço Serviço Cliente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Tipo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Qualificação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Qualificação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Grupo Agendamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Agendamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Área Geográfica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Área Geográfica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Tipo > Tipo de Preparação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Preparação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Inconveniente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Inconveniente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Posição
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Posição' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Indicação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Indicação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Tipo > Tipo de OS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Tipo > Tipo de Box
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Box' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Tipo de Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > T.M.O
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='T.M.O' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Empresa', 0), ('TMOTempo', 1), ('Incluir', 2), ('Alterar', 3), ('Excluir', 4)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Causa
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Causa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Status Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Status Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Dados de Terceiro Garantia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dados de Terceiro Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > Dano
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Dano' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Oficina > Garantia > SG Padrão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='SG Padrão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Bairro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bairro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Tipo de Endereço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Endereço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Tipo de Logradouro
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Logradouro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Endereçamento > Tipo de Telefone
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo de Telefone' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Endereçamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Visão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Visão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Grupo F&I
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo F&I' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Importação Financeiras
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Importação Financeiras' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Observação do Documento Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Observação do Documento Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Adaptação Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Adaptação Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Cor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Combustível
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Combustível' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Família
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Família > Família
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Família > Manutenção Custos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção Custos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Família > Manutenção Moeda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manutenção Moeda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Família' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Marca
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Marca' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Modelo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Modelo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Descontos', 0), ('Incluir', 1), ('Alterar', 2), ('Excluir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Motorização
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motorização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Transmissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Transmissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Ano
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ano' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Grupo de Modelo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Modelo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Opcional
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Opcional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Característica Veículo > Seguradora
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Seguradora' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Característica Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Check List
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Check List > Grupo Check List
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Check List > Item Check List
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Item Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Check List > Check List Entrega
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Check List Entrega' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Check List' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Bônus
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Bônus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Documento Dinâmico
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Documento Dinâmico' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Valor Agregado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Valor Agregado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Estado Civil
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Estado Civil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Escolaridade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Escolaridade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Faixa Renda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faixa Renda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Hobby
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Hobby' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Profissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Profissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Proteção ao Crédito
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Proteção ao Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Ramo de Atividade
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Ramo de Atividade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Segmento Mercado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Segmento Mercado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Logística > Cadastro Vagas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro Vagas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Logística' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Cadastrar em Lote', 0), ('Incluir', 1), ('Alterar', 2), ('Excluir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Motivo Avaliação Usado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Avaliação Usado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Veículo > Logística > Cadastro Flash Aves
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cadastro Flash Aves' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Logística' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Veículo'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Serviços > Regra Negócio
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Regra Negócio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Serviços > Serviço Adicional
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço Adicional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Tipo Banco Pedido
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Banco Pedido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Condição Pagamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Condição Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Situação Tributária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Situação Tributária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > CFO
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CFO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Natureza Operação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Natureza Operação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > NCM
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NCM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Mídia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Mídia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Grupo de Mídia
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo de Mídia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Motivo Venda Perdida
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Venda Perdida' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Meio Contato
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Meio Contato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Tabela de Frete
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tabela de Frete' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Natureza Atendimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Natureza Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Revisão KM
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Revisão KM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Carência Floor Plan
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Carência Floor Plan' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Faixa Comissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Faixa Comissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Item Qualificação do Atendimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Item Qualificação do Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Convênio/Enquadramento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Convênio/Enquadramento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Grupo Tributo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Tributo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Financeira
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Finalidade de Compra
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Finalidade de Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Tipo Pagamento Proposta
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Pagamento Proposta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Item Avaliação Usado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Item Avaliação Usado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Grupo Item Avaliação Usado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Grupo Item Avaliação Usado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Motivo Recusa Test Drive
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Recusa Test Drive' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Custo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Custo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Tipo Faturamento Veículo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Faturamento Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Fonte
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fonte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Motivo Reclamação Faturamento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo Reclamação Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Configuração Frotista
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configuração Frotista' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem > Tipo Observação Vistoria
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Tipo Observação Vistoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Imagem > Processo de Digitalização
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Processo de Digitalização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Imagem' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Markup de Veículos
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Markup de Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Item Avulso
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Item Avulso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Procedência
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Procedência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > IBPT
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='IBPT' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Pátio
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Pátio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Modalidade de Venda
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Modalidade de Venda' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Classificação Fiscal
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > CNAE
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CNAE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Query > Vendas Realizadas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Vendas Realizadas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Query' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Query > Evolução de Vendas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Evolução de Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Query' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Query > Títulos a Receber
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Títulos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Query' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Motivo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Motivo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Resultado de Contato
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Resultado de Contato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Serviço Prestado
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Serviço Prestado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Fase Atendimento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Fase Atendimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Concorrente
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Concorrente' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Cargo
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Cargo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > CRM > Configurações Revalidação
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configurações Revalidação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Situação Vendedor
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Situação Vendedor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Gerenciamento Tabela Fipe
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Gerenciamento Tabela Fipe' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Percentuais', 0), ('Incluir', 1), ('Alterar', 2), ('Excluir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Configuração Emissão
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Configuração Emissão' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Empresa', 0), ('Incluir', 1), ('Alterar', 2), ('Excluir', 3)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Classificação Tributária
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Classificação Tributária' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Crédito Presumido IBS/CBS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Crédito Presumido IBS/CBS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > NBS
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NBS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal > Indicador Operação Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Indicador Operação Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Veículo > Política de Descontos por Dias Em Estoque
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Política de Descontos por Dias Em Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > NFe
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NFe' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Consultar Status NFe', 0), ('Enviar NFe', 1), ('Solicitar Contingência', 2), ('Cancelar / Inutilizar NFe', 3), ('Imprimir Danfe', 4), ('Reenviar E-mail', 5), ('Enviar boleto p/ o Cliente', 6), ('Carta de Correção', 7), ('Refresh Automático', 8), ('Incluir', 9), ('Alterar', 10), ('Excluir', 11)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > NFSe
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NFSe' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Consultar Status NFSe', 0), ('Enviar NFSe', 1), ('Cancelar NFSe', 2), ('Cancelamento Manual NFSe', 3), ('Imprimir NFSe', 4), ('Refresh Automático', 5), ('Incluir', 6), ('Alterar', 7), ('Excluir', 8)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Relatórios > Nota Fiscal Eletrônica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletrônica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Relatórios > Impressão em Lote Nota Fiscal Eletrônica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Impressão em Lote Nota Fiscal Eletrônica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Relatórios > Impressão em Lote Nota Fiscal de Serviço Eletrônica
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Impressão em Lote Nota Fiscal de Serviço Eletrônica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Relatórios > Lista de Reimpressão de DANFE
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Lista de Reimpressão de DANFE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Manifestação do Destinátario
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Manifestação do Destinátario' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Certificado Digital > Validade Certificado Digital
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Validade Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Exportação em Lote de Notas Fiscais Eletrônicas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação em Lote de Notas Fiscais Eletrônicas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Integração Montadora de Notas Fiscais Eletrônicas
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Integração Montadora de Notas Fiscais Eletrônicas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Exportação em Lote de Notas Fiscais Eletrônicas de Serviço
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Exportação em Lote de Notas Fiscais Eletrônicas de Serviço' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Certificado Digital
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Certificado Digital > Atualizar Certificado Digital
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Atualizar Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > Certificado Digital > Certificado PIX
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Certificado PIX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Certificado Digital' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro')))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

-- Cadastro > Nota Fiscal Eletronica > NFe Evento
INSERT INTO governanca_menus (id, sistema, pai_id, nome, ordem)
SELECT gen_random_uuid(), 'Dealer.net', pai.id, v.nome, v.ordem
FROM (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='NFe Evento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND nome='Nota Fiscal Eletronica' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema='Dealer.net' AND pai_id IS NULL AND nome='Cadastro'))) AS pai(id)
CROSS JOIN (VALUES ('Incluir', 0), ('Alterar', 1), ('Excluir', 2)) AS v(nome, ordem)
WHERE NOT EXISTS (SELECT 1 FROM governanca_menus b WHERE b.pai_id = pai.id AND b.nome = v.nome);

