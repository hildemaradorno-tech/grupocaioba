-- Permite relacionar o Funcionário de cada Fonte BI por um campo diferente do nome (que às
-- vezes não bate 100% entre o relatório do SharePoint e o cadastro). O funcionário ganha um
-- campo de código livre (o código dele no sistema de origem do relatório), e cada Fonte BI
-- escolhe contra qual campo do cadastro de Funcionários ela deve casar a coluna de funcionário
-- do arquivo: Nome do Funcionário (padrão) ou esse Código no Sistema.
ALTER TABLE dim_funcionarios ADD COLUMN IF NOT EXISTS codigo_sistema_bi text;

ALTER TABLE dim_fontes_bi ADD COLUMN IF NOT EXISTS campo_relacao_funcionario text NOT NULL DEFAULT 'nome_funcionario';

ALTER TABLE dim_fontes_bi DROP CONSTRAINT IF EXISTS dim_fontes_bi_campo_relacao_funcionario_check;
ALTER TABLE dim_fontes_bi ADD CONSTRAINT dim_fontes_bi_campo_relacao_funcionario_check
  CHECK (campo_relacao_funcionario IN ('nome_funcionario', 'codigo_sistema_bi'));
