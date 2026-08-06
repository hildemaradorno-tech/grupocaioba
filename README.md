# Portal de Gestão - Grupo Caiobá

Sistema React com Supabase para controle de acesso por grupo.

## Setup Rápido

⚠️ **Leia este guia primeiro:** [SUPABASE_SIMPLES.md](./SUPABASE_SIMPLES.md) (Passo-a-passo bem claro!)

1. **Configure Supabase** seguindo o guia acima

2. **Crie `.env.local` na raiz:**
   - Copie o arquivo `.env.local.example`
   - Renomeie para `.env.local`
   - Preencha com suas credenciais do Supabase

3. **Instale dependências:**
```bash
npm install
```

4. **Rode o projeto:**
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## Funcionalidades

- ✅ Usuários e Grupos de Acesso (CRUD)
- ✅ Gerenciamento de Permissões por Grupo (checkboxes)
- ✅ Árvore de Menus Configurável
- ✅ Autenticação via Supabase Auth
- ✅ RLS (Row Level Security) para proteção

## Estrutura

```
src/
├── pages/          # Páginas do sistema
├── layouts/        # Layouts compartilhados
├── services/       # Serviços (API via Supabase)
└── App.jsx         # Roteamento
```

## Menus Disponíveis

**Configurações**
- Usuários
- Grupos de Acessos

**Cadastro de Tabelas**
- Agrupamento Empresas
- Empresas
- Departamentos
- Setores
- Box
- Agrupamento Cargos
- Cargos
- Tipos de O.S.
- Tipos de Produtos
- Classificação Compra
- Movimento de Venda
- Natureza de Operações

## Como Funciona

1. Cria um **Grupo** (ex: "Diretoria")
2. Clica "Permissões" e marca/desmarca menus
3. Cria um **Usuário** e atribui um grupo
4. Próximo login: só vê menus permitidos

---

Para mais detalhes sobre Supabase, veja [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

