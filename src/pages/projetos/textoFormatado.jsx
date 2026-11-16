import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Bold, Italic, Underline, Strikethrough } from 'lucide-react'

// Formato salvo no banco (compatível com o que já existia):
//   **negrito**   *itálico*   __sublinhado__   ~~tachado~~   quebra de linha = \n
// O usuário não vê esses caracteres: o editor mostra a formatação pronta.

const MARCADORES = ['**', '__', '~~', '*']
const TAG_POR_MARCADOR = { '**': 'strong', '*': 'em', '__': 'u', '~~': 's' }

// Acha o fechamento do marcador: conteúdo não vazio e o próximo caractere
// não pode repetir o marcador (resolve "***x***" = negrito + itálico).
const acharFechamento = (s, m, desde) => {
  let j = s.indexOf(m, desde + 1)
  while (j !== -1) {
    if (s[j + m.length] !== m[0]) return j
    j = s.indexOf(m, j + 1)
  }
  return -1
}

// Converte o texto salvo em uma árvore simples: [{ tipo: 'texto', v } | { tipo: tag, filhos }]
const parseInline = (s) => {
  const out = []
  let buf = ''
  let i = 0
  while (i < s.length) {
    const m = MARCADORES.find(mk => s.startsWith(mk, i))
    if (m) {
      // busca a partir de i+len+1: garante pelo menos 1 caractere de conteúdo
      const j = acharFechamento(s, m, i + m.length)
      if (j !== -1) {
        if (buf) { out.push({ tipo: 'texto', v: buf }); buf = '' }
        out.push({ tipo: TAG_POR_MARCADOR[m], filhos: parseInline(s.slice(i + m.length, j)) })
        i = j + m.length
        continue
      }
    }
    buf += s[i]
    i++
  }
  if (buf) out.push({ tipo: 'texto', v: buf })
  return out
}

const arvoreParaReact = (nos, prefixo) => nos.map((n, idx) => {
  const key = `${prefixo}-${idx}`
  if (n.tipo === 'texto') return n.v
  const Tag = n.tipo
  return <Tag key={key}>{arvoreParaReact(n.filhos, key)}</Tag>
})

const escHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const arvoreParaHtml = (nos) => nos.map(n =>
  n.tipo === 'texto' ? escHtml(n.v) : `<${n.tipo}>${arvoreParaHtml(n.filhos)}</${n.tipo}>`
).join('')

/** Mostra o nome formatado (negrito, itálico, sublinhado, tachado, quebras de linha). */
export const renderNome = (nome) => {
  if (!nome) return null
  return nome.split('\n').reduce((acc, linha, i) => {
    if (i > 0) acc.push(<br key={`br${i}`} />)
    acc.push(...arvoreParaReact(parseInline(linha), `l${i}`))
    return acc
  }, [])
}

/** Texto sem marcadores (para listas, selects, títulos). */
export const textoPlano = (s) => (s || '').replace(/\*\*?|__|~~/g, '')

const mdParaHtml = (md) => (md || '').split('\n').map(l => arvoreParaHtml(parseInline(l))).join('<br>')

// Converte o conteúdo do editor de volta para o formato salvo
const htmlParaMd = (raiz) => {
  const walk = (no, ctx) => {
    if (no.nodeType === 3) return no.nodeValue.replace(/ /g, ' ')
    if (no.nodeType !== 1) return ''
    const tag = no.nodeName
    if (tag === 'BR') return '\n'
    const st = no.style || {}
    const fw = st.fontWeight
    const deco = `${st.textDecoration || ''} ${st.textDecorationLine || ''}`
    const ativos = {
      b: ctx.b || tag === 'B' || tag === 'STRONG' || fw === 'bold' || Number(fw) >= 600,
      i: ctx.i || tag === 'I' || tag === 'EM' || st.fontStyle === 'italic',
      u: ctx.u || tag === 'U' || deco.includes('underline'),
      s: ctx.s || tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || deco.includes('line-through'),
    }
    let interno = Array.from(no.childNodes).map(c => walk(c, ativos)).join('')
    const bloco = tag === 'DIV' || tag === 'P'
    // Envolve só com o que este nó acrescentou (evita marcadores duplicados)
    const envolver = (on, antes, m) => {
      if (on && !antes && interno.trim()) interno = `${m}${interno}${m}`
    }
    envolver(ativos.s, ctx.s, '~~')
    envolver(ativos.u, ctx.u, '__')
    envolver(ativos.i, ctx.i, '*')
    envolver(ativos.b, ctx.b, '**')
    if (bloco) {
      // Chrome cria <div> a cada Enter; <div><br></div> = linha vazia
      const so_br = no.childNodes.length === 1 && no.firstChild.nodeName === 'BR'
      return '\n' + (so_br ? '' : interno)
    }
    return interno
  }
  let md = Array.from(raiz.childNodes).map(c => walk(c, {})).join('')
  if (md.startsWith('\n')) md = md.slice(1)
  // junta trechos vizinhos com a mesma formatação (<b>a</b><b>b</b> → **ab**)
  md = md.replace(/\*\*\*\*/g, '').replace(/____/g, '').replace(/~~~~/g, '')
  return md.replace(/\n$/, '')
}

const BOTOES = [
  { cmd: 'bold',          Icon: Bold,          title: 'Negrito (Ctrl+B)' },
  { cmd: 'italic',        Icon: Italic,        title: 'Itálico (Ctrl+I)' },
  { cmd: 'underline',     Icon: Underline,     title: 'Sublinhado (Ctrl+U)' },
  { cmd: 'strikeThrough', Icon: Strikethrough, title: 'Tachado' },
]

/**
 * Campo de texto com formatação visual (sem mostrar asteriscos).
 * value/onChange trabalham com o formato salvo (**, *, __, ~~).
 * ref expõe inserirTexto(texto) — usado pelos atalhos de texto padrão.
 */
const EditorTextoRico = forwardRef(function EditorTextoRico({ value, onChange, minHeight = 110, label }, ref) {
  const elRef = useRef(null)
  const ultimoEmitido = useRef(null)
  const [ativos, setAtivos] = useState({})

  // Sincroniza só quando o valor muda de fora (ex.: carregou a tarefa, trocou de tarefa)
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (value !== ultimoEmitido.current) {
      el.innerHTML = mdParaHtml(value)
      ultimoEmitido.current = value
    }
  }, [value])

  const emitir = () => {
    const el = elRef.current
    if (!el) return
    const md = htmlParaMd(el)
    ultimoEmitido.current = md
    onChange(md)
  }

  const atualizarAtivos = () => {
    try {
      setAtivos(Object.fromEntries(BOTOES.map(b => [b.cmd, document.queryCommandState(b.cmd)])))
    } catch { /* navegador sem suporte */ }
  }

  useEffect(() => {
    const onSel = () => {
      const el = elRef.current
      const sel = window.getSelection()
      if (el && sel && sel.anchorNode && el.contains(sel.anchorNode)) atualizarAtivos()
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const focarSeNecessario = () => {
    const el = elRef.current
    if (!el) return
    const sel = window.getSelection()
    if (document.activeElement !== el || !sel || !el.contains(sel.anchorNode)) {
      el.focus()
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(false)
      sel.removeAllRanges()
      sel.addRange(r)
    }
  }

  const aplicar = (cmd) => {
    focarSeNecessario()
    document.execCommand('styleWithCSS', false, false)
    document.execCommand(cmd, false, null)
    emitir()
    atualizarAtivos()
  }

  useImperativeHandle(ref, () => ({
    inserirTexto: (texto) => {
      focarSeNecessario()
      document.execCommand('insertText', false, texto)
      emitir()
    },
  }))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {label}
        <div className="flex gap-1">
          {BOTOES.map(({ cmd, Icon, title }) => (
            <button key={cmd} type="button" title={title}
              onMouseDown={e => { e.preventDefault(); aplicar(cmd) }}
              className={`w-6 h-6 flex items-center justify-center border rounded transition-colors ${
                ativos[cmd] ? 'bg-blue-100 border-blue-300 text-blue-700' : 'text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            ><Icon className="h-3.5 w-3.5" /></button>
          ))}
        </div>
      </div>
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitir}
        onKeyUp={atualizarAtivos}
        onMouseUp={atualizarAtivos}
        onPaste={e => {
          // Cola sempre como texto puro (evita trazer cores/fontes de outros programas)
          e.preventDefault()
          const texto = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, texto)
        }}
        style={{ minHeight }}
        className="w-full max-h-64 overflow-y-auto text-xs p-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 whitespace-pre-wrap break-words"
      />
    </div>
  )
})

export default EditorTextoRico
