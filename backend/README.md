# Backend - Portal de Gestão

API Express.js com SQLite para gerenciar usuários, grupos e permissões.

## Instalação

```bash
cd backend
npm install
```

## Rodar

```bash
npm run dev
```

Servidor inicia em `http://localhost:3001`

## Banco de Dados

Arquivo SQLite: `backend/portal.db` (criado automaticamente)

### Tabelas

1. **grupos_acesso** - Perfis/grupos de usuários
2. **usuarios** - Usuários do sistema
3. **permissoes_telas** - Permissões por menu/grupo

## Endpoints

### Grupos
- `GET /api/grupos` - Listar todos
- `POST /api/grupos` - Criar (body: `{ nome_grupo }`)
- `PUT /api/grupos/:id` - Atualizar
- `DELETE /api/grupos/:id` - Deletar

### Usuários
- `GET /api/usuarios` - Listar todos
- `POST /api/usuarios` - Criar (body: `{ nome, email, senha, grupo_id }`)
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Deletar

### Permissões
- `GET /api/permissoes/:grupo_id` - Listar por grupo
- `POST /api/permissoes` - Criar/atualizar (body: `{ grupo_id, menu_path, visualizar }`)
- `DELETE /api/permissoes/:id` - Deletar

### Auth
- `POST /api/login` - Login (body: `{ email, senha }`)
  - Retorna: `{ token, usuario }`

## Variáveis de Ambiente

Crie `.env` (ou use `.env.example`):
```
JWT_SECRET=your-secret-key
PORT=3001
```
