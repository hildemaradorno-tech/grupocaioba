# Matriz KPIs — Mapeamento de Indicadores

Este arquivo documenta cada indicador da Matriz KPIs:
- **Fonte**: arquivo/sistema de origem dos dados
- **Filtro**: como selecionar as linhas relevantes
- **Colunas**: quais colunas do arquivo são usadas
- **Fórmula**: como calcular o valor final

---

## BLOCO 3 — PÓS-VENDA

### GERENTE GERAL

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Total Oficina (Peças + Serviços) | ✅ Implementado |
| 2 | Faturamento Total Peças Oficina | ✅ Implementado |
| 3 | Faturamento Total Serviços Oficina | ✅ Implementado |
| 4 | Margem Bruta Serviços | ✅ Implementado |
| 5 | Margem Bruta Peças Oficina | ✅ Implementado |
| 6 | O.S. aberta sem veículo | ⏳ Pendente |
| 7 | Absorção de Pós-Venda | ⏳ Pendente |
| 8 | Recusa de Garantia | ⏳ Pendente |
| 9 | Penetração Plano de Manutenção | ⏳ Pendente |
| 10 | NPS (Net Promoter Score) | ⏳ Pendente |
| 11 | O.S. abertas >= 30 dias | ⏳ Pendente |

---

### Indicador 1 — Faturamento Total Oficina (Peças + Serviços)

Resultado final = **Fonte A + Fonte B** (soma período a período)

#### Fonte A — Peças e Serviços NF (`RPR001_VENDAPRODUTO`)
- **Arquivo**: `RPR001_VENDAPRODUTO YYYY.MM.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos`
- **Filtro de linhas**: `NF_OsTipoDes <> branco` (somente itens vinculados a uma OS de oficina)
- **Coluna de data**: `NF_DataMov` (índice 32) — convertida para YYYY-MM
- **Coluna de valor**: `NFItem_VlTotal` (índice 47)
- **Sinal do valor** (coluna `NaturezaOperacao`, índice 4):
  - `"VEN"` → valor positivo
  - `"DVE"` → valor negativo (devolução)
- **Fórmula**: `SUM(vlVendas) − SUM(vlDevolucoes)` para linhas com OS vinculada no período

#### Fonte B — Serviços Recepcionista (`REL_VENDARECEPCIONISTA_REPORT`)
- **Arquivo**: `REL_VENDARECEPCIONISTA_REPORT*.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Serviços/{ano}/`
- **Filtro de linhas**: nenhum (todas as linhas válidas são incluídas)
- **Coluna de data**: `NotaFiscal_DataEmissao` — convertida para YYYY-MM
- **Coluna de valor**: `tot_serv`
- **Fórmula**: `SUM(tot_serv)` por período

#### Consolidação
- **Fórmula final**: `Fonte A + Fonte B` somados por período (q1–q4, m01–m12, FY)
- **Agrupamento**: Por trimestre (Q1=jan-mar, Q2=abr-jun, Q3=jul-set, Q4=out-dez) e FY (ano completo)
- **Unidade exibida**: R$ (valor inteiro arredondado)

---

### Indicador 2 — Faturamento Total Peças Oficina

#### Fonte A — Peças Oficina (`RPR001_VENDAPRODUTO`)
- **Arquivo**: `RPR001_VENDAPRODUTO YYYY.MM.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos`
- **Filtro de linhas**: `NF_OsTipoDes <> branco` (somente itens vinculados a uma OS de oficina)
- **Coluna de data**: `NF_DataMov` (índice 32) — convertida para YYYY-MM
- **Coluna de valor**: `NFItem_VlTotal` (índice 47)
- **Sinal do valor** (coluna `NaturezaOperacao`, índice 4):
  - `"VEN"` → valor positivo
  - `"DVE"` → valor negativo (devolução)
- **Fórmula**: `SUM(vlVendas) − SUM(vlDevolucoes)` para linhas com OS vinculada no período

#### Consolidação
- **Fórmula final**: `Fonte A VEN − Fonte A DVE`
- **Unidade exibida**: R$ (valor inteiro arredondado)

---

### Indicador 3 — Faturamento Total Serviços Oficina

#### Fonte A — Serviços Recepcionista (`REL_VENDARECEPCIONISTA_REPORT`)
- **Arquivo**: `REL_VENDARECEPCIONISTA_REPORT*.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Serviços/{ano}/`
- **Filtro de linhas**: nenhum (todas as linhas válidas são incluídas)
- **Coluna de data**: `NotaFiscal_DataEmissao` — convertida para YYYY-MM
- **Coluna de valor**: `tot_serv`
- **Fórmula**: `SUM(tot_serv)` por período

#### Consolidação
- **Fórmula final**: `SUM(tot_serv)` — soma direta, sem devolução
- **Unidade exibida**: R$ (valor inteiro arredondado)

---

### Indicador 4 — Margem Bruta Serviços

#### Fonte A — Lucro Serviços Recepcionistas (`REL_VENDARECEPCIONISTA_REPORT`)
- **Arquivo**: `REL_VENDARECEPCIONISTA_REPORT*.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Serviços/{ano}/`
- **Filtro de linhas**: nenhum (todas as linhas válidas são incluídas)
- **Coluna de data**: `NotaFiscal_DataEmissao` — convertida para YYYY-MM
- **Coluna de valor**: `margem_servico`
- **Fórmula**: `SUM(margem_servico)` por período

#### Fonte B — Faturamento Bruto Serviços Recepcionistas (`REL_VENDARECEPCIONISTA_REPORT`)
- **Arquivo**: mesmo arquivo da Fonte A
- **Coluna de valor**: `tot_serv`
- **Fórmula**: `SUM(tot_serv)` por período (mesma base do Indicador 1 Fonte B)

#### Consolidação
- **Fórmula final**: `Fonte A / Fonte B × 100`
- **Unidade exibida**: % (uma casa decimal)

---

### Indicador 5 — Margem Bruta Peças Oficina

#### Fonte A — Lucro Total Oficina (`RPR001_VENDAPRODUTO`)
- **Arquivo**: `RPR001_VENDAPRODUTO YYYY.MM.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos`
- **Filtro de linhas**: `NF_OsTipoDes <> branco` (todos os itens vinculados a uma OS de oficina)
- **Coluna de data**: `NF_DataMov` (índice 32) — convertida para YYYY-MM
- **Coluna de valor**: `NFItem_VlMargemCont` (índice 20)
- **Sinal do valor** (coluna `NaturezaOperacao`, índice 4):
  - `"VEN"` → valor positivo
  - `"DVE"` → valor negativo (devolução; Excel traz positivo → subtração explícita)
- **Fórmula**: `SUM(vlMargemContVendas) − SUM(vlMargemContDevolucoes)` no período

#### Fonte B — Faturamento Total Oficina (`RPR001_VENDAPRODUTO`)
- **Arquivo**: mesmo arquivo da Fonte A
- **Filtro de linhas**: `NF_OsTipoDes <> branco` — todos os itens com OS (PECAS + SERVICOS + TRP + FLUIDOS)
- **Coluna de valor**: `NFItem_VlTotal` (índice 47)
- **Fórmula**: `SUM(vlVendas) − SUM(vlDevolucoes)` por período
- **Nota**: Fonte B é idêntica ao **Indicador 1 Fonte A** (bucket TOTAL)

#### Consolidação
- **Fórmula final**: `Fonte A / Fonte B × 100`
  - Numerador = lucro líquido das **peças OFI** (`vlMargemCont`)
  - Denominador = faturamento líquido **total** da oficina (`vlTotal`)
- **Unidade exibida**: % (uma casa decimal)

---

### Indicador 6 — O.S. aberta sem veículo

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: %

---

### Indicador 7 — Absorção de Pós-Venda

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: %

---

### Indicador 8 — Recusa de Garantia

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: %

---

### Indicador 9 — Penetração Plano de Manutenção

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: %

---

### Indicador 10 — NPS (Net Promoter Score)

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: pts

---

### Indicador 11 — O.S. abertas >= 30 dias

- **Fonte**: _a definir_
- **Filtro**: _a definir_
- **Colunas**: _a definir_
- **Fórmula**: _a definir_
- **Unidade exibida**: %

---

### GERENTE CASA CAMPO GRANDE

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Oficina (Serviços) | ⏳ Pendente |
| 2 | Eficácia da Oficina | ⏳ Pendente |
| 3 | Produtividade da Oficina | ⏳ Pendente |
| 4 | Margem Bruta Serviços | ⏳ Pendente |
| 5 | Penetração Plano Manutenção | ⏳ Pendente |
| 6 | Recusa de Garantia | ⏳ Pendente |

### GERENTE CASA DOURADOS

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Oficina (Serviços) | ⏳ Pendente |
| 2 | Faturamento Balcão | ⏳ Pendente |
| 3 | Eficácia da Oficina | ⏳ Pendente |
| 4 | Produtividade da Oficina | ⏳ Pendente |
| 5 | Auditoria (Score) | ⏳ Pendente |
| 6 | Recusa de Garantia | ⏳ Pendente |

### GERENTE CASA TRÊS LAGOAS

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Oficina (Serviços) | ⏳ Pendente |
| 2 | Eficácia da Oficina | ⏳ Pendente |
| 3 | Produtividade da Oficina | ⏳ Pendente |
| 4 | Penetração Plano Manutenção | ⏳ Pendente |
| 5 | Recusa de Garantia | ⏳ Pendente |

### GERENTE CASA CHAPADÃO DO SUL

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Oficina (Serviços) | ⏳ Pendente |
| 2 | Eficácia da Oficina | ⏳ Pendente |
| 3 | Produtividade da Oficina | ⏳ Pendente |
| 4 | Penetração Plano Manutenção | ⏳ Pendente |
| 5 | Recusa de Garantia | ⏳ Pendente |

> Os indicadores por casa seguem a mesma lógica do GERENTE GERAL,
> filtrados por `NF_EmpresaCod` (1=Campo Grande, 2=Dourados, 12=Três Lagoas, 13=Chapadão do Sul)

---

### GERENTE QUALIDADE

| # | Indicador | Status |
|---|-----------|--------|
| 1 | O.S. Garantia em Aberto | ⏳ Pendente |
| 2 | Total de Agendamentos | ⏳ Pendente |
| 3 | % Agendamentos Convertidos | ⏳ Pendente |
| 4 | Auditorias por Casa | ⏳ Pendente |
| 5 | NPS (Net Promoter Score) | ⏳ Pendente |

---

## AUDITORIA DE FONTES — KPIs

### Indicador 10 — Faturamento TRP

#### Fonte A — Peças/TRP Oficina (`RPR001_VENDAPRODUTO`)
- **Arquivo**: `RPR001_VENDAPRODUTO YYYY.MM.xlsx` — pasta SharePoint `/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos`
- **Filtro de linhas**: `NF_OsTipoDes <> branco` (somente itens vinculados a uma OS de oficina)
- **Filtro adicional**: `ProdTipoCod IN (2, 24, 27, 28)`
- **Coluna de data**: `NF_DataMov` (índice 32) — convertida para YYYY-MM
- **Coluna de valor**: `NFItem_VlTotal` (índice 47)
- **Sinal do valor** (coluna `NaturezaOperacao`, índice 4):
  - `"VEN"` → valor positivo
  - `"DVE"` → valor negativo (devolução)
- **Fórmula**: `SUM(vlVendas) − SUM(vlDevolucoes)` para linhas filtradas no período

#### Consolidação
- **Fórmula final**: `Fonte A VEN − Fonte A DVE`
- **Unidade exibida**: R$ (valor inteiro arredondado)
- **Status**: ✅ Implementado

---

## BLOCO 3 — PEÇAS

### GERENTE GERAL — PEÇAS

| # | Indicador | Status |
|---|-----------|--------|
| 1 | Faturamento Total Peças | ⏳ Pendente |
| 2 | Margem Bruta de Peças | ⏳ Pendente |
| 3 | Faturamento TRP | ⏳ Pendente |
| 4 | Gestão de Clientes (Evolução Carteira) | ⏳ Pendente |
| 5 | Giro de Estoque | ⏳ Pendente |
| 6 | Resultado de Auditoria | ⏳ Pendente |
| 7 | Obsoletos | ⏳ Pendente |

---

## BLOCO 2 — INDICADORES OPERACIONAIS

| # | Indicador | Status |
|---|-----------|--------|
| - | Market Share TOTAL | ⏳ Pendente |
| - | Retail Novos | ⏳ Pendente |
| - | Margem Bruta Novos | ⏳ Pendente |
| - | Volume de Vendas Seminovos | ⏳ Pendente |
| - | Penetração de Seguros % | ⏳ Pendente |
| - | Passagens na Oficina | ⏳ Pendente |
| - | Clientes Ativos | ⏳ Pendente |
| - | Faturamento Peças (R$) | ⏳ Pendente |

---

## BLOCO 1 — INDICADORES CORPORATIVOS

| # | Indicador | Status |
|---|-----------|--------|
| - | Receita Líquida Total | ⏳ Pendente |
| - | Margem Bruta Total | ⏳ Pendente |
| - | Margem Bruta % | ⏳ Pendente |
| - | Margem Líquida Total | ⏳ Pendente |
| - | Margem Líquida % | ⏳ Pendente |
| - | Despesas Operacionais | ⏳ Pendente |

---

---

## Auditoria de Fontes

Submenu disponível em **Matriz KPIs → Auditoria de Fontes** (`/kpi/auditoria`).

Exibe em tabela todos os valores brutos por fonte para cada indicador implementado, com o mesmo seletor de ano e período (trimestral / mensal / FY) das demais páginas.

| Indicador | Linhas expostas |
|-----------|----------------|
| Ind 1 — Faturamento Total Oficina | Vendas brutas RPR001, Devoluções RPR001, Faturamento líquido RPR001, tot_serv Recepcionista, **RESULTADO** (A+B) |
| Ind 2 — Margem Bruta Serviços | Faturamento bruto (tot_serv), **RESULTADO** (%) |
| Ind 3 — Margem Bruta Peças Oficina | Lucro vendas PECAS_OFI, Lucro devoluções PECAS_OFI, Lucro líquido, Fat. vendas, Fat. devoluções, Fat. líquido, **RESULTADO** (%) |

Rota backend: `GET /api/kpi/auditoria?year=YYYY`

---

## Legenda de Status

- ✅ Implementado — valor real vindo do SharePoint
- ⏳ Pendente — aguardando definição da fonte/fórmula
- 🚧 Em desenvolvimento — sendo implementado
- ❌ Sem fonte — dado não disponível no sistema
