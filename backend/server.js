import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Carrega backend/.env primeiro, depois o .env.local da raiz (sem sobrescrever)
dotenv.config({ path: path.join(__dirname, '.env') })
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: false })
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { initDb } from './db.js'
import { v4 as uuid } from 'uuid'
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import kpiRoutes       from './routes/kpi.js'
import garantiasRoutes from './routes/garantias.js'
import calculoComissaoRoutes from './routes/calculoComissao.js'
import planoDmsRoutes from './routes/planoDms.js'
import biMedidasRoutes from './routes/biMedidas.js'
import rhFeriasRoutes from './routes/rhFerias.js'
import hondaRoutes from './routes/honda.js'
import truckpagRoutes from './routes/truckpag.js'
import googleCalendarRoutes from './routes/googleCalendar.js'
import projetosManifestacoesRoutes from './routes/projetosManifestacoes.js'
import auditAiRoutes from './routes/auditAi.js'
import { iniciarSchedulerKpi } from './services/kpiSyncScheduler.js'
import { iniciarSchedulerManifestacao } from './services/manifestacaoScheduler.js'

const app = express()
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }))
app.options('*', cors())
app.use(express.json())

// ── Rotas da Matriz KPIs (SharePoint / Microsoft Graph) ──────────────────────
app.use('/api/kpi', kpiRoutes)

// ── Rotas Garantias DAF (SharePoint ROF001_OSABERTA) ─────────────────────────
app.use('/api/garantias', garantiasRoutes)

// ── Rotas Fonte/Base de Cálculo (SharePoint genérico p/ comissões) ───────────
app.use('/api/calculo-comissao', calculoComissaoRoutes)

// ── Rotas Comissão Plano DMS (O.S. P04 x Chassi x Valor do Plano) ────────────
app.use('/api/plano-dms', planoDmsRoutes)

// ── Rotas Fonte BI / Medida BI (SharePoint genérico p/ dashboards de BI) ─────
app.use('/api/bi-medidas', biMedidasRoutes)

// ── Rotas RH Férias (SharePoint Relacao de Ferias Calculadas) ─────────────────
app.use('/api/rh-ferias', rhFeriasRoutes)

// ── Rotas Honda (integração MicroWork Cloud) ──────────────────────────────────
app.use('/api/honda', hondaRoutes)

// ── Rotas TruckPag (SharePoint — Financeiro DAF) ─────────────────────────────
app.use('/api/truckpag', truckpagRoutes)

// ── Rotas Google Calendar (OAuth + leitura de eventos) ───────────────────────
app.use('/api/google-calendar', googleCalendarRoutes)

// ── Rotas Gestão de Projetos — Período de Manifestação (Etapa 2) ────────────
app.use('/api/projetos', projetosManifestacoesRoutes)

// ── Rotas Gestão de Projetos — Auditoria Externa (Copiloto de IA) ───────────
app.use('/api/audit-ai', auditAiRoutes)

// Handler de erro global — sem isso, um erro lançado dentro de uma rota (ex: pasta/arquivo do
// SharePoint não encontrado) cai no handler padrão do Express, que responde com uma página HTML
// em vez de JSON — o frontend tenta interpretar aquilo como JSON e quebra com
// "Unexpected token '<', <!DOCTYPE...". Cobre as rotas acima que usam o padrão wrap()/next(err)
// (kpi, garantias, calculo-comissao, rh-ferias, honda). As rotas definidas dentro de start() já
// respondem com res.status().json() sozinhas, então não dependem deste handler.
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor' })
})

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-dev'

// Cliente Supabase com service role — permite criar/deletar usuários sem confirmação de email
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null

let db

// ==================== INICIALIZAÇÃO ====================
async function start() {
  db = await initDb()
  console.log('✓ Banco de dados inicializado')

  // ==================== GRUPOS DE ACESSO ====================
  
  app.get('/api/grupos', async (req, res) => {
    try {
      const grupos = await db.all('SELECT * FROM grupos_acesso ORDER BY nome_grupo')
      res.json(grupos)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/grupos', async (req, res) => {
    try {
      const { nome_grupo } = req.body
      const id = uuid()
      await db.run(
        'INSERT INTO grupos_acesso (id, nome_grupo) VALUES (?, ?)',
        [id, nome_grupo]
      )
      res.json({ id, nome_grupo })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/grupos/:id', async (req, res) => {
    try {
      const { id } = req.params
      const { nome_grupo } = req.body
      await db.run(
        'UPDATE grupos_acesso SET nome_grupo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
        [nome_grupo, id]
      )
      res.json({ id, nome_grupo })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.delete('/api/grupos/:id', async (req, res) => {
    try {
      const { id } = req.params
      await db.run('DELETE FROM grupos_acesso WHERE id = ?', [id])
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==================== USUÁRIOS ====================
  
  app.get('/api/usuarios', async (req, res) => {
    try {
      const usuarios = await db.all(`
        SELECT u.id, u.nome, u.email, u.grupo_id, g.nome_grupo, u.ativo
        FROM usuarios u
        JOIN grupos_acesso g ON u.grupo_id = g.id
        ORDER BY u.nome
      `)
      res.json(usuarios)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/usuarios', async (req, res) => {
    try {
      const { nome, email, senha, grupo_id } = req.body
      const id = uuid()
      const senhaHash = await bcryptjs.hash(senha, 10)
      
      await db.run(
        'INSERT INTO usuarios (id, nome, email, senha, grupo_id) VALUES (?, ?, ?, ?, ?)',
        [id, nome, email, senhaHash, grupo_id]
      )
      
      res.json({ id, nome, email, grupo_id })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put('/api/usuarios/:id', async (req, res) => {
    try {
      const { id } = req.params
      const { nome, email, grupo_id } = req.body
      
      await db.run(
        'UPDATE usuarios SET nome = ?, email = ?, grupo_id = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
        [nome, email, grupo_id, id]
      )
      
      res.json({ id, nome, email, grupo_id })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.delete('/api/usuarios/:id', async (req, res) => {
    try {
      const { id } = req.params
      await db.run('DELETE FROM usuarios WHERE id = ?', [id])
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==================== PERMISSÕES DE TELAS ====================
  
  app.get('/api/permissoes/:grupo_id', async (req, res) => {
    try {
      const { grupo_id } = req.params
      const permissoes = await db.all(
        'SELECT * FROM permissoes_telas WHERE grupo_id = ?',
        [grupo_id]
      )
      res.json(permissoes)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/permissoes', async (req, res) => {
    try {
      const { grupo_id, menu_path, visualizar, editar, excluir } = req.body
      const id = uuid()
      
      // Tenta inserir; se já existe, atualiza
      await db.run(`
        INSERT OR REPLACE INTO permissoes_telas (id, grupo_id, menu_path, visualizar, editar, excluir)
        VALUES (COALESCE((SELECT id FROM permissoes_telas WHERE grupo_id = ? AND menu_path = ?), ?), ?, ?, ?, ?, ?)
      `, [grupo_id, menu_path, id, grupo_id, menu_path, visualizar, editar, excluir])
      
      res.json({ grupo_id, menu_path, visualizar, editar, excluir })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.delete('/api/permissoes/:id', async (req, res) => {
    try {
      const { id } = req.params
      await db.run('DELETE FROM permissoes_telas WHERE id = ?', [id])
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==================== CRIAÇÃO DE USUÁRIO VIA SUPABASE ADMIN ====================

  // POST /api/auth/create-user — cria usuário no Supabase Auth e envia e-mail de convite/boas-vindas
  // (o próprio usuário define a senha ao clicar no link do e-mail, admin não define senha nenhuma).
  app.post('/api/auth/create-user', async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY não configurada no backend. Configure o arquivo backend/.env.' })
    }
    const { nome, email, grupo_id, redirectTo } = req.body
    if (!nome || !email) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email' })
    }

    // 1. Cria no Supabase Auth e envia o e-mail de convite (template "Invite user" do Supabase)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { nome },
      ...(redirectTo ? { redirectTo } : {}),
    })
    if (authError) return res.status(400).json({ error: authError.message })

    // 2. Insere perfil na tabela usuarios — sem senha_atualizada_em, pois ainda não definiu senha
    const perfilInsert = { id: authData.user.id, nome, email, ativo: true }
    if (grupo_id) perfilInsert.grupo_id = grupo_id
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert([perfilInsert])
      .select()
    if (error) {
      // Rollback: remove do auth para não deixar usuário órfão
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return res.status(400).json({ error: error.message })
    }

    res.json(data?.[0])
  })

  app.get('/api/auth/status', async (req, res) => {
    res.json({ serviceRoleConfigured: !!supabaseAdmin })
  })

  // PUT /api/auth/update-password/:id — atualiza senha de usuário existente
  app.put('/api/auth/update-password/:id', async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY não configurada no backend.' })
    }
    const { id } = req.params
    const { senha } = req.body
    if (!senha) return res.status(400).json({ error: 'Senha obrigatória.' })
    if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' })

    console.log('[update-password] id recebido:', id)

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: senha })
    console.log('[update-password] resultado updateUserById:', error ? error.message : 'OK')

    if (error) {
      if (error.message === 'User not found') {
        // Fallback: busca email na tabela usuarios e localiza no auth por email
        const { data: perfil, error: perfilErr } = await supabaseAdmin.from('usuarios').select('email').eq('id', id).single()
        console.log('[update-password] perfil encontrado:', perfil, perfilErr?.message)

        if (perfil?.email) {
          const { data: lista, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
          console.log('[update-password] listUsers count:', lista?.users?.length, listErr?.message)

          const authUser = (lista?.users || []).find(u => u.email === perfil.email)
          console.log('[update-password] authUser por email:', authUser?.id)

          if (authUser) {
            const { error: err2 } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: senha })
            if (err2) return res.status(400).json({ error: err2.message })
            await supabaseAdmin.from('usuarios').update({ senha_atualizada_em: new Date().toISOString() }).eq('id', id)
            return res.json({ success: true })
          } else {
            return res.status(400).json({ error: `Usuário com e-mail "${perfil.email}" não encontrado no Supabase Auth.` })
          }
        }
      }
      return res.status(400).json({ error: error.message })
    }

    await supabaseAdmin.from('usuarios').update({ senha_atualizada_em: new Date().toISOString() }).eq('id', id)

    res.json({ success: true })
  })

  // DELETE /api/auth/delete-user/:id — remove usuário do Supabase Auth + tabela usuarios
  app.delete('/api/auth/delete-user/:id', async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY não configurada no backend.' })
    }
    const { id } = req.params

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authErr) return res.status(400).json({ error: authErr.message })

    const { error: dbErr } = await supabaseAdmin.from('usuarios').delete().eq('id', id)
    if (dbErr) return res.status(400).json({ error: dbErr.message })

    res.json({ success: true })
  })

  // ==================== AUTENTICAÇÃO ====================
  
  app.post('/api/login', async (req, res) => {
    try {
      const { email, senha } = req.body
      const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email])
      
      if (!usuario) {
        return res.status(401).json({ error: 'Usuário não encontrado' })
      }
      
      const senhaOk = await bcryptjs.compare(senha, usuario.senha)
      if (!senhaOk) {
        return res.status(401).json({ error: 'Senha incorreta' })
      }
      
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, grupo_id: usuario.grupo_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
      
      res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, grupo_id: usuario.grupo_id } })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ==================== PORTA ====================
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`✓ Servidor rodando em http://localhost:${PORT}`)
  })

  iniciarSchedulerKpi()
  iniciarSchedulerManifestacao()
}

start().catch(console.error)
