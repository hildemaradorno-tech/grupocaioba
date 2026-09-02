-- ============================================================
-- Exclusão em massa: menus do Dealer.net não utilizados
-- Gerado a partir de "Arquivos/RSG001_MENUGRUPOACESSO EXCLUIR.xlsx"
-- 293 itens (a exclusão em cascata remove os submenus deles também)
-- Executar no Supabase SQL Editor
-- ============================================================

-- BackOffice Plus > Auditoria > Cadastrar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastrar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Auditoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Auditoria > Consultar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consultar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Auditoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Cadastro > Financeiro > Ações de Cobrança
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Ações de Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Financeiro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL))));

-- BackOffice Plus > Contas a Pagar > Análise de Faturas de Peças a Pagar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Análise de Faturas de Peças a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Pagar > Análise de Veículos a Pagar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Análise de Veículos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Pagar > Controle Adiant. a Fornecedores
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Controle Adiant. a Fornecedores' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Pagar > Pagamento de Icms de Veículos e Peças
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pagamento de Icms de Veículos e Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Pagar > Pagamentos Múltiplos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pagamentos Múltiplos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Receber > Baixa de Bônus, Hold Back e Comissões
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Baixa de Bônus, Hold Back e Comissões' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Receber > Bloqueio e Desbloqueio de Clientes
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Bloqueio e Desbloqueio de Clientes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Receber > Currículo de Pagamentos Plus
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Currículo de Pagamentos Plus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Receber > Ranking de Clientes
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Ranking de Clientes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Contas a Receber > Sistema de Cobrança
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Sistema de Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Parâmetros > Auditoria
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Auditoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Parâmetros > Contas a Receber > E-mail Sistema de Cobrança
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'E-mail Sistema de Cobrança' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL))));

-- BackOffice Plus > Parâmetros > Relatórios Títulos de Veículos em Atraso
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios Títulos de Veículos em Atraso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Parâmetros > Tesouraria > Pagamentos Múltiplos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pagamentos Múltiplos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Parâmetros' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL))));

-- BackOffice Plus > Relatórios > Contas a Receber
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Relatórios > Contas a Receber > Ações de Cobrança por Operador
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Ações de Cobrança por Operador' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL))));

-- BackOffice Plus > Relatórios > Contas a Receber > Títulos de Veículos em Atraso
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Títulos de Veículos em Atraso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contas a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL))));

-- BackOffice Plus > Tesouraria > Conciliar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Conciliar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Tesouraria > Pagamentos Múltiplos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pagamentos Múltiplos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tesouraria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BackOffice Plus > Veículos > Liberação de Entrega do Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Liberação de Entrega do Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BackOffice Plus' AND pai_id IS NULL)));

-- BAJAJ > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'BAJAJ' AND pai_id IS NULL))));

-- Chery > Produto > Importar > Lista de Preços
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Lista de Preços' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Chery' AND pai_id IS NULL))));

-- Dafra > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Dafra' AND pai_id IS NULL))));

-- DWFServices > API_MOTORLEADS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'API_MOTORLEADS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- DWFServices > EPECAS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EPECAS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- DWFServices > ML_FULL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ML_FULL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- DWFServices > MUVSTOCK
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MUVSTOCK' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- DWFServices > SERPRO_RENAVE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'SERPRO_RENAVE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- DWFServices > SYONET
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'SYONET' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DWFServices' AND pai_id IS NULL));

-- ECF > DAV
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'DAV' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- ECF > ECF
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- ECF > Integração ECF
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Integração ECF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- ECF > Mapa Resumo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Mapa Resumo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- ECF > SPED
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'SPED' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- ECF > Tipo Pagamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tipo Pagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ECF' AND pai_id IS NULL));

-- EMRYS > Cobrança de Títulos em Atraso
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cobrança de Títulos em Atraso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Contrato
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Dados Geração Contrato
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Dados Geração Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Gerar Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gerar Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Gerar Reajuste
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gerar Reajuste' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Gerar Senha
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gerar Senha' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Informativo de Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Informativo de Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Informativo de Título Vencido
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Informativo de Título Vencido' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Item Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Item Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Objeto
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Objeto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Painel de Contrato
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Painel de Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL));

-- EMRYS > Relatórios > Contrato x Usuários
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contrato x Usuários' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL)));

-- EMRYS > Relatórios > Contrato x Usuários
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contrato x Usuários' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'EMRYS' AND pai_id IS NULL)));

-- FastService > Grava Audio
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Grava Audio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Link de pagamentos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Link de pagamentos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Nota Fiscal
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Nota Fiscal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Nota Fiscal OS Tipo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Nota Fiscal OS Tipo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Notas Fiscais da OS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Notas Fiscais da OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Pesquisa Boca de Caixa
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pesquisa Boca de Caixa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > pesquisa por e-mail
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'pesquisa por e-mail' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Verbalizacao Audio
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Verbalizacao Audio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- FastService > Video Chamada
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Video Chamada' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FastService' AND pai_id IS NULL));

-- Fendt > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fendt' AND pai_id IS NULL))));

-- Fleet Rental > Cadastro > Franquia de KM
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Franquia de KM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Cadastro > Item Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Item Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Configuração
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Configuração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Contrato
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Controle de Adicionais
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Controle de Adicionais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Desmobilização
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Desmobilização' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Gerar Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gerar Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Gestão de Débitos Veiculares
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gestão de Débitos Veiculares' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Manutenção
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Manutenção' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Medição
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Medição' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Migração
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Migração' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Reajuste de Contrato
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Reajuste de Contrato' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL));

-- Fleet Rental > Relatórios > Contratos de Locação
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contratos de Locação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Relatórios > Contratos de Locação
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Contratos de Locação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Relatórios > Frota de Veículos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Frota de Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Relatórios > Frota de Veículos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Frota de Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Relatórios > Itens em Manutenção da Frota
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Itens em Manutenção da Frota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- Fleet Rental > Relatórios > Itens em Manutenção da Frota
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Itens em Manutenção da Frota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relatórios' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fleet Rental' AND pai_id IS NULL)));

-- FParts > Conferência
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Conferência' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Entregar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Entregar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Estoque
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Fluxo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fluxo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Fluxo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fluxo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Inventário
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Inventário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Lista
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Lista' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Recebimento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Recebimento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Romaneio
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Romaneio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FParts > Vendas
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FParts' AND pai_id IS NULL));

-- FReport > Oficina > Faturamento da Oficina
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Faturamento da Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Oficina' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FReport' AND pai_id IS NULL)));

-- FReport > Produtos > Faturamento de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Faturamento de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FReport' AND pai_id IS NULL)));

-- FReport > Veículos > Faturamento de Veiculos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Faturamento de Veiculos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'FReport' AND pai_id IS NULL)));

-- Gateway > Acampa WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Acampa WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > AdSet
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'AdSet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Agendamneto WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Agendamneto WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Avaliação de Usado Montadora WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Avaliação de Usado Montadora WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Avaliação de Usado WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Avaliação de Usado WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Bitric Vendas Veículos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Bitric Vendas Veículos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Cadastrar Atendimento WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastrar Atendimento WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Cadastrar Movimento Material Consumo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastrar Movimento Material Consumo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Cadastrar Produto Pedido (Gateway)
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastrar Produto Pedido (Gateway)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Cadastrar Produto Pedido (REST)
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastrar Produto Pedido (REST)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Cliente WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cliente WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Compra Veículo Usado
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Compra Veículo Usado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Empresa
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Empresa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Estoque Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Estoque Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Lançamento Contábil
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Lançamento Contábil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Modelo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Modelo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Nota Peças
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Nota Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Nota Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Nota Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Nota Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Nota Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta OS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Pessoa
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Pessoa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Produto
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Produto Bloqueio
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Produto Bloqueio' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Produto Estoque
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Produto Estoque' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Produto Movimentação
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Produto Movimentação' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Produto Preco
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Produto Preco' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Proposta
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Proposta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Saldo Conta Gerencial
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Saldo Conta Gerencial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Saldo Contabil
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Saldo Contabil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Tabela
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Tabela' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Titulos a Pagar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Titulos a Pagar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Titulos a Receber
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Titulos a Receber' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Usuário
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Usuário' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consulta Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consulta Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consultar Contas Conta Gerencial
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consultar Contas Conta Gerencial' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consultar Informacao Estoque Produto Ecommerce
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consultar Informacao Estoque Produto Ecommerce' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Consultar Veiculo por Chassi
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Consultar Veiculo por Chassi' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Controle de Portaria
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Controle de Portaria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Fly Chat WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Fly Chat WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Handit Pedido Compra Em Aberto
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Handit Pedido Compra Em Aberto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Horario Agendamento Disponivel
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Horario Agendamento Disponivel' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Integracao NFe WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Integracao NFe WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Integracao Sales Force
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Integracao Sales Force' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Lead B2B WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Lead B2B WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Ano
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Ano' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Atendimento Vendedor
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Atendimento Vendedor' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Combustivel
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Combustivel' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Cor Externa
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Cor Externa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Cor Interna
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Cor Interna' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Escolaridade
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Escolaridade' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Estado Civil
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Estado Civil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Finalidade Compra
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Finalidade Compra' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Financeira
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Financeira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Item Avaliacao
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Item Avaliacao' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Marca
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Marca' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Modelo Veiculo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Modelo Veiculo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Motivo Avaliacao
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Motivo Avaliacao' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Opcional
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Opcional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Profissao
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Profissao' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Servico Adicional
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Servico Adicional' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Tipo Observacao Vistoria
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Tipo Observacao Vistoria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Listar Tipo Pagamento Proposta
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Listar Tipo Pagamento Proposta' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Novo Varejo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Novo Varejo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Oficina Mobile
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Oficina Mobile' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Produto WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Produto WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Quality WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Quality WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Query Return > ESTOQUEVEICULO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'ESTOQUEVEICULO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC ADIANTAMENTOS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC ADIANTAMENTOS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC NFEMITIDASRECEITA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC NFEMITIDASRECEITA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC TITULOPAGAR
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC TITULOPAGAR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC TITULORECEBER
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC TITULORECEBER' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSAPROVADOSGERENCIAMENTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSAPROVADOSGERENCIAMENTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSDEVOLVIDOS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSDEVOLVIDOS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSEMINOVOSESTOQUE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSEMINOVOSESTOQUE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSFATURADOS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSFATURADOS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSNOVOSESTOQUE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSNOVOSESTOQUE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > GNC VEICULOSPAGOSESTOQUE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'GNC VEICULOSPAGOSESTOQUE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR COMBUSTIVEL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR COMBUSTIVEL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR CONDICAOPAGAMENTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR CONDICAOPAGAMENTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR CONTAGERENCIAL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR CONTAGERENCIAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR COR EXTERNA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR COR EXTERNA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR COR INTERNA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR COR INTERNA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR DEPARTAMENTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR DEPARTAMENTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR NATUREZAOPERACAO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR NATUREZAOPERACAO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR OPCIONAL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR OPCIONAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > LISTAR TIPODOCUMENTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'LISTAR TIPODOCUMENTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODELO POR MARCA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODELO POR MARCA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODERNIZA CONSULTA LISTASEPARACAO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODERNIZA CONSULTA LISTASEPARACAO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODERNIZA CONSULTA NOTAFISCAL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODERNIZA CONSULTA NOTAFISCAL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODERNIZA CONSULTA PRODUTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODERNIZA CONSULTA PRODUTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODERNIZA CONSULTA PRODUTOESTOQUE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODERNIZA CONSULTA PRODUTOESTOQUE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > MODERNIZA CONSULTA REQUISICAOOFICINA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MODERNIZA CONSULTA REQUISICAOOFICINA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > PEDRAGON OS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'PEDRAGON OS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > PEDRAGON OSFECHADAS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'PEDRAGON OSFECHADAS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > PEDRAGON VENDAPORSETOR
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'PEDRAGON VENDAPORSETOR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > PROPOSTAPEDIDO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'PROPOSTAPEDIDO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > RAMPFY VENDAVEICULO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'RAMPFY VENDAVEICULO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > RESUMOCOMPRA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'RESUMOCOMPRA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > RETURN TABLE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'RETURN TABLE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > TMO POR MARCA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'TMO POR MARCA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > VALORAGREGADO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VALORAGREGADO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > VEICULOSCOMPRADOSPERIODO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VEICULOSCOMPRADOSPERIODO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > VENDAPRODUTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VENDAPRODUTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > VENDASADICIONAIS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VENDASADICIONAIS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Query Return > VENDASFINANCEIRA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VENDASFINANCEIRA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Query Return' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL)));

-- Gateway > Tesouraria Lançamento WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tesouraria Lançamento WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Tesouraria WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Tesouraria WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Título Movimento WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Título Movimento WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Título WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Título WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Veículo WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículo WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > VeiculoInterno WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VeiculoInterno WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Veículos Vendidos Por Período WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículos Vendidos Por Período WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Venda Externa WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Venda Externa WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Viasul WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Viasul WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Volks Pos Vendas
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Volks Pos Vendas' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS Banco PIX
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS Banco PIX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_AnalysisBI
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_AnalysisBI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_APDATA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_APDATA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_AtendimentoCadastroWeb
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_AtendimentoCadastroWeb' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_AutoForce
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_AutoForce' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_AutoMob
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_AutoMob' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Bamaq
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Bamaq' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Barigui
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Barigui' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Caoa
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Caoa' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_CAOAProtheus
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_CAOAProtheus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Carbel
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Carbel' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_CARHOUSE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_CARHOUSE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_CRM
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_CRM' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DAF
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DAF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Dahruj
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Dahruj' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DDX
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DDX' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DealerIntelligence
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DealerIntelligence' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DealernetCertificado
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DealernetCertificado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Deva
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Deva' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DIAUTO
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DIAUTO' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_DSI
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_DSI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Ecommerce_Produto
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Ecommerce_Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_EmpresaAppLiberado
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_EmpresaAppLiberado' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_FastAvaliacaoApi
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_FastAvaliacaoApi' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_FastServiceApi
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_FastServiceApi' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Faturamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Faturamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_FeIBrasil
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_FeIBrasil' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_FELICE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_FELICE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Fipal
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Fipal' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_FORNECEDORA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_FORNECEDORA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_GrupoSimoes
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_GrupoSimoes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Holmes
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Holmes' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_HolmesAPI
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_HolmesAPI' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_IntegracaoBancaria
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_IntegracaoBancaria' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_IntegracaoBreitkopf
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_IntegracaoBreitkopf' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Italiana
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Italiana' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Jira
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Jira' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_LinkTEF
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_LinkTEF' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Milaso
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Milaso' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_MobileTEFDealer
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_MobileTEFDealer' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_MobileTEFV2
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_MobileTEFV2' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Moderniza
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Moderniza' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Movisis
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Movisis' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Nissan
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Nissan' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_NOCARVEL
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_NOCARVEL' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Parvi
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Parvi' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Pedragon
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Pedragon' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Pegasus
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Pegasus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_PetroPlus
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_PetroPlus' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Pianna
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Pianna' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_PRIMAVIA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_PRIMAVIA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_PropostaDados
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_PropostaDados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_RAMASA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_RAMASA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_RampFY
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_RampFY' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Recorrencia_LinkPagamento
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Recorrencia_LinkPagamento' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Rental
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Rental' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_RoyalEnfield
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_RoyalEnfield' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Saga
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Saga' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_SmartDealer
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_SmartDealer' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Syonet
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Syonet' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Totvs
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Totvs' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_Toyota
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_Toyota' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_VALENCE
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_VALENCE' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_VALENCE_OFICINA
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_VALENCE_OFICINA' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > WS_VIAMAR
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'WS_VIAMAR' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Gateway > Wurth WS
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Wurth WS' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Gateway' AND pai_id IS NULL));

-- Intelligent Supply > Exportar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Intelligent Supply' AND pai_id IS NULL));

-- Intelligent Supply > Importar
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Intelligent Supply' AND pai_id IS NULL));

-- Iveco > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Iveco' AND pai_id IS NULL))));

-- Kawasaki > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Kawasaki' AND pai_id IS NULL))));

-- MAN > Exportar > Produtos > Pedido de Peças (Move2)
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pedido de Peças (Move2)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'MAN' AND pai_id IS NULL))));

-- Massey Ferguson > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Massey Ferguson' AND pai_id IS NULL))));

-- Scania > Exportar > Garantia URGNOT
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Garantia URGNOT' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Scania' AND pai_id IS NULL)));

-- Stellantis > Exportar > E-Gate
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'E-Gate' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL)));

-- Stellantis > Garantia > Importar > Crédito
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Crédito' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Garantia > Importar > Espelho da NF de Transporte
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Espelho da NF de Transporte' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Garantia > Importar > Relação volumes faturados
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Relação volumes faturados' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Garantia > Importar > Retorno R.E.V.P.
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Retorno R.E.V.P.' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Garantia' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Produto > Importar > Cadastro Importação Fatura Pedido de Peças
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro Importação Fatura Pedido de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Produto > Importar > Nota Fiscal Entrada de Peças
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Nota Fiscal Entrada de Peças' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Veículo > Importar > Faturamento de Veículo
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Faturamento de Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Stellantis > Veículo > Importar > Lista de preço de Veículos/Opcionais
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Lista de preço de Veículos/Opcionais' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Veículo' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Stellantis' AND pai_id IS NULL))));

-- Valtra > Produto > Importar > Cadastro e Atualização de Preço de Produtos
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Cadastro e Atualização de Preço de Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Importar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produto' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Valtra' AND pai_id IS NULL))));

-- VOLKSWAGEN > Exportar > Produtos > Pedido de Peças (Move2)
DELETE FROM governanca_menus WHERE id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Pedido de Peças (Move2)' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Produtos' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'Exportar' AND pai_id = (SELECT id FROM governanca_menus WHERE sistema = 'Dealer.net' AND nome = 'VOLKSWAGEN' AND pai_id IS NULL))));

