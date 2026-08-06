# Configuração: SharePoint → Microsoft Graph API

## Passo 1 — Registrar o App no Azure Active Directory

1. Acesse https://portal.azure.com
2. Vá em **Azure Active Directory → App registrations → New registration**
3. Preencha:
   - **Name:** `Portal KPIs Caiobá`
   - **Supported account types:** `Accounts in this organizational directory only`
   - Redirect URI: deixe vazio
4. Clique em **Register**
5. Copie o **Application (client) ID** → este é o `AZURE_CLIENT_ID`
6. Copie o **Directory (tenant) ID** → este é o `AZURE_TENANT_ID`

## Passo 2 — Criar o Client Secret

1. No app registrado, vá em **Certificates & secrets → New client secret**
2. Descrição: `Portal KPIs` | Expira: `24 months`
3. Clique em **Add**
4. **COPIE O VALOR AGORA** (não aparece novamente) → este é o `AZURE_CLIENT_SECRET`

## Passo 3 — Configurar Permissões de API

1. Vá em **API permissions → Add a permission → Microsoft Graph → Application permissions**
2. Adicione as permissões:
   - `Files.Read.All`
   - `Sites.Read.All`
3. Clique em **Grant admin consent for [seu tenant]** (requer ser admin do tenant)

## Passo 4 — Obter o SHAREPOINT_SITE_ID

Abra o navegador (logado no Microsoft 365) e acesse:

```
https://graph.microsoft.com/v1.0/sites/{seu-dominio}.sharepoint.com:/sites/{nome-do-site}
```

Exemplo:
```
https://graph.microsoft.com/v1.0/sites/caioba.sharepoint.com:/sites/KPIs
```

Ou use o Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer

A resposta terá um campo `"id"` com formato:
```
caioba.sharepoint.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```
→ Este é o `SHAREPOINT_SITE_ID`

## Passo 5 — Obter o SHAREPOINT_FILE_ID

Com o `SHAREPOINT_SITE_ID` em mãos, acesse:

```
https://graph.microsoft.com/v1.0/sites/{SITE_ID}/drive/root:/Pasta/CAIOBÁ MATRIZ DE KPIs 2026_2.xlsx
```

O campo `"id"` da resposta é o `SHAREPOINT_FILE_ID`.

Ou, no SharePoint Online:
1. Abra o arquivo Excel no SharePoint
2. Copie o link → terá um parâmetro `sourcedoc=%7B...%7D` (decodificado é o ID)

## Passo 6 — Configurar o arquivo .env

Copie `.env.example` para `.env` na pasta `backend/` e preencha:

```env
JWT_SECRET=sua-chave-jwt-segura

AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=valor-copiado-no-passo-2

SHAREPOINT_SITE_ID=caioba.sharepoint.com,xxx,yyy
SHAREPOINT_FILE_ID=01XXXXXXXXXXXXXXXXXXXXXXXXXX

KPI_CACHE_TTL_MIN=10
```

## Passo 7 — Verificar nomes das abas no Excel

Por padrão o sistema espera estas abas no arquivo:
- `RESULTADOS`
- `BLOCO 1`
- `BLOCO 2`
- `BLOCO 3 - PÓS VENDA`
- `BLOCO 3 - PEÇAS`
- `ORÇAMENTO BACKLOG`

Se os nomes forem diferentes, configure no `.env`:
```env
KPI_SHEET_RESULTADOS=RESULTADOS
KPI_SHEET_BLOCO1=BLOCO 1
# etc.
```

## Passo 8 — Testar

Inicie o backend:
```bash
cd backend
npm run dev
```

Teste o status:
```
GET http://localhost:3001/api/kpi/status
```

Resposta esperada quando configurado corretamente:
```json
{
  "configured": true,
  "sheets": { "resultados": "RESULTADOS", ... },
  "cacheTtlMin": 10
}
```

## Mapeamento de colunas esperado no Excel

### Aba RESULTADOS
| Coluna Excel | Campo interno |
|---|---|
| VERTICAL | chave de agrupamento |
| BLOCO | bloco |
| PESO | peso |
| % ATING. Q1 | q1 |
| % ATING. Q2 | q2 |
| % ATING. Q3 | q3 |
| % ATING. Q4 | q4 |
| % ATING. FY | fy |

### Abas BLOCO 1, 2, 3
Colunas de identificação + para cada período (Q1, Q2, Q3, Q4, FY):
- `META Q1` → meta do período
- `VALOR REAL Q1` ou `2026Q1` → valor realizado

> **Dica:** Se a coluna no Excel tiver nome diferente, edite o mapper em
> `backend/services/sharepointKpi.js` nas funções `getBloco1()`, `getBloco2()` etc.
> O sistema aceita variações com/sem acento automaticamente.
