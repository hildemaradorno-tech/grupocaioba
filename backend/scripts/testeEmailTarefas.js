/**
 * Script de teste: envia e-mail de notificação de tarefa para Hildemar Lima.
 * Usa a primeira tarefa ativa encontrada — sem tocar na tabela de dedup.
 * Executar: node --experimental-vm-modules scripts/testeEmailTarefas.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local'), override: false })

import { createClient } from '@supabase/supabase-js'
import { enviarEmail } from '../services/emailService.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

function fmtData(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function htmlNotificacao({ tipo, tarefa, projeto }) {
  const titulosPorTipo = {
    '1_dia_antes': `⚠️ Tarefa vence amanhã (${fmtData(tarefa.data_fim)})`,
    'no_dia':      `🔔 Tarefa vence hoje (${fmtData(tarefa.data_fim)})`,
    '1_dia_apos':  `🔴 Tarefa em atraso — venceu em ${fmtData(tarefa.data_fim)}`,
  }
  const corPorTipo = {
    '1_dia_antes': '#f59e0b',
    'no_dia':      '#3b82f6',
    '1_dia_apos':  '#ef4444',
  }
  const titulo = titulosPorTipo[tipo]
  const cor    = corPorTipo[tipo]
  const link   = `${FRONTEND_URL}/projetos/detalhe/${tarefa.projeto_id}`

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${cor};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">${titulo}</h2>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="margin:0 0 8px"><strong>Projeto:</strong> ${projeto?.nome || '—'}</p>
        <p style="margin:0 0 8px"><strong>Tarefa:</strong> ${tarefa.nome}</p>
        <p style="margin:0 0 8px"><strong>Data de término:</strong> ${fmtData(tarefa.data_fim)}</p>
        <p style="margin:0 0 8px"><strong>Status atual:</strong> ${tarefa.status_kanban || '—'}</p>
        ${tarefa.etapa ? `<p style="margin:0 0 16px"><strong>Etapa:</strong> ${tarefa.etapa}ª</p>` : ''}
        <a href="${link}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          Acessar o Projeto
        </a>
      </div>
    </div>`
}

async function main() {
  // Busca qualquer tarefa ativa de Hildemar Lima com data_fim definida
  const { data: tarefas, error } = await supabase
    .from('proj_tarefas')
    .select('id, nome, data_fim, status_kanban, etapa, projeto_id, responsavel_nome, proj_projetos(id, nome)')
    .eq('responsavel_nome', 'Hildemar Lima')
    .not('status_kanban', 'in', '("concluido","cancelado")')
    .not('data_fim', 'is', null)
    .order('data_fim', { ascending: true })
    .limit(3)

  if (error || !tarefas?.length) {
    console.error('Nenhuma tarefa encontrada para Hildemar Lima:', error?.message)
    process.exit(1)
  }

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('email')
    .eq('nome', 'Hildemar Lima')
    .limit(1)
  const email = usuarios?.[0]?.email
  if (!email) {
    console.error('E-mail de Hildemar Lima não encontrado.')
    process.exit(1)
  }

  // Envia um e-mail de cada tipo usando as primeiras tarefas encontradas
  const tipos = ['1_dia_antes', 'no_dia', '1_dia_apos']
  for (let i = 0; i < Math.min(tipos.length, tarefas.length); i++) {
    const tipo = tipos[i]
    const t    = tarefas[i]
    const proj = t.proj_projetos
    const subjectsPorTipo = {
      '1_dia_antes': `[TESTE] [Projetos] Tarefa vence amanhã: ${t.nome.slice(0, 60)}`,
      'no_dia':      `[TESTE] [Projetos] Tarefa vence hoje: ${t.nome.slice(0, 60)}`,
      '1_dia_apos':  `[TESTE] [Projetos] Tarefa em atraso: ${t.nome.slice(0, 60)}`,
    }
    await enviarEmail({
      to: email,
      subject: subjectsPorTipo[tipo],
      html: htmlNotificacao({ tipo, tarefa: t, projeto: proj }),
    })
    console.log(`✓ [${tipo}] E-mail enviado para ${email} — tarefa: "${t.nome.slice(0, 60)}"`)
  }
}

main().catch(err => { console.error('Erro:', err.message); process.exit(1) })
