import React, { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Smile } from 'lucide-react'

const TAGS_PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'A'])

function sanitizarHtml(html) {
  const container = document.createElement('div')
  container.innerHTML = html
  const limpar = (node) => {
    ;[...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!TAGS_PERMITIDAS.has(child.tagName)) {
          const texto = document.createTextNode(child.textContent)
          node.replaceChild(texto, child)
          return
        }
        ;[...child.attributes].forEach(attr => {
          const nome = attr.name.toLowerCase()
          if (nome === 'href') {
            if (/^\s*javascript:/i.test(attr.value)) child.removeAttribute(attr.name)
          } else {
            child.removeAttribute(attr.name)
          }
        })
        limpar(child)
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child)
      }
    })
  }
  limpar(container)
  return container.innerHTML
}

const EMOJIS = [
  '✅','❌','⚠️','💡','📌','📎','🔹','🔸','▶️','✔️',
  '📋','📁','🗂️','📝','✏️','🖊️','📊','📈','📉','🔍',
  '👍','👎','👏','🙌','🤝','💪','🎯','🚀','⭐','🔔',
  '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','🔴','🟡','🟢','🔵','⚪',
]

export default function ManifestacaoRichEditor({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null)
  const ultimoValorExterno = useRef('')
  const [emojiAberto, setEmojiAberto] = useState(false)
  const emojiRef = useRef(null)

  useEffect(() => {
    if (ref.current && value !== ultimoValorExterno.current && value !== ref.current.innerHTML) {
      ref.current.innerHTML = value || ''
      ultimoValorExterno.current = value || ''
    }
  }, [value])

  // Fecha o picker de emoji ao clicar fora
  useEffect(() => {
    if (!emojiAberto) return
    const handle = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiAberto(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [emojiAberto])

  const exec = (cmd, arg) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    handleInput()
  }

  const handleInput = () => {
    if (!ref.current) return
    const html = sanitizarHtml(ref.current.innerHTML)
    ultimoValorExterno.current = html
    onChange(html)
  }

  const inserirLink = () => {
    const url = window.prompt('URL do link:')
    if (url) exec('createLink', url)
  }

  const inserirEmoji = (emoji) => {
    if (disabled) return
    ref.current?.focus()
    document.execCommand('insertText', false, emoji)
    handleInput()
    setEmojiAberto(false)
  }

  const btn = 'p-1.5 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500'

  return (
    <div className={`border border-slate-200 rounded-md overflow-visible ${disabled ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-100 bg-slate-50 rounded-t-md">
        <button type="button" disabled={disabled} onClick={() => exec('bold')}                  className={btn} title="Negrito"><Bold         className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => exec('italic')}                className={btn} title="Itálico"><Italic       className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => exec('underline')}             className={btn} title="Sublinhado"><Underline  className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" disabled={disabled} onClick={() => exec('insertUnorderedList')}   className={btn} title="Marcadores"><List          className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => exec('insertOrderedList')}     className={btn} title="Lista numerada"><ListOrdered className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" disabled={disabled} onClick={inserirLink}                         className={btn} title="Link"><LinkIcon         className="h-3.5 w-3.5" /></button>
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEmojiAberto(v => !v)}
            className={btn}
            title="Emoji"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          {emojiAberto && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-52">
              <div className="grid grid-cols-10 gap-0.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => inserirEmoji(e)}
                    className="text-base hover:bg-slate-100 rounded p-0.5 transition-colors leading-none"
                    title={e}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="min-h-[90px] max-h-[260px] overflow-y-auto p-2.5 text-xs text-slate-700 leading-relaxed focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"
      />
    </div>
  )
}
