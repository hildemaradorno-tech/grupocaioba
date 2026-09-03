import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Smile, CaseSensitive } from 'lucide-react'

const CORES = [
  { label: 'Automático', value: null },
  { label: 'Preto',      value: '#0f172a' },
  { label: 'Cinza',      value: '#64748b' },
  { label: 'Vermelho',   value: '#dc2626' },
  { label: 'Laranja',    value: '#ea580c' },
  { label: 'Amarelo',    value: '#ca8a04' },
  { label: 'Verde',      value: '#16a34a' },
  { label: 'Azul',       value: '#2563eb' },
  { label: 'Roxo',       value: '#9333ea' },
  { label: 'Rosa',       value: '#db2777' },
]

const EMOJI_CATEGORIAS = [
  { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😋','😎','🤩','🥳','😏','😒','😔','😟','🙁','😣','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','😱','😨','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😮','🥱','😴','😵','🤐','🥴','🤢','🤧','😷','🤒','🤕','🤑','😈','👿','💩','🤡','👻','💀','☠️','👽','🤖'] },
  { label: 'Gestos', emojis: ['👋','🤚','🖐️','✋','🖖','🤙','👌','🤌','✌️','🤞','🖕','👆','👇','👈','👉','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤲','🤝','🙏','💪','🦾','🤳','💅','🫶'] },
  { label: 'Pessoas', emojis: ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','👮','💂','🕵️','👷','🤴','👸','👲','🧕','🤵','👰','🧙','🧛','🧟','🧞','🧜','🧚','🧝','🦸','🦹'] },
  { label: 'Natureza', emojis: ['🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🍃','🍂','🍁','🌾','🌵','🌴','🌳','🌲','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🦋','🐝','🌙','⭐','🌟','💫','✨','☀️','🌤️','⛅','☁️','🌧️','⛈️','❄️','🌊','🌀','🌈'] },
  { label: 'Comida', emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥦','🥕','🌽','🍕','🍔','🌮','🌯','🥗','🍜','🍝','🍣','🍱','🍛','🍚','☕','🍵','🥤','🧃','🍺','🍷','🥂','🎂','🍰','🍫','🍬','🍭'] },
  { label: 'Viagem', emojis: ['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🚌','🏍️','🚲','🛴','🚁','✈️','🚂','🚢','🛸','🏔️','⛰️','🌋','🏕️','🏖️','🏜️','🏝️','🏛️','🏗️','🏢','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🗼','🗽','⛪','🕌','⛩️','🗺️','🧭'] },
  { label: 'Atividades', emojis: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎳','🏋️','🤸','🏊','🚴','🏄','⛷️','🏂','🎮','🕹️','🎲','♟️','🎯','🎨','🖌️','🎭','🎬','🎤','🎧','🎵','🎶','🎹','🥁','🎸','🎷','🎺','🎻','🏆','🥇','🎖️','🎪'] },
  { label: 'Objetos', emojis: ['💼','📋','📌','📍','📎','🔗','📝','✏️','🖊️','📊','📈','📉','🔍','🔎','💡','🔦','💰','💵','💳','📱','💻','🖥️','⌨️','🖱️','📷','📸','🎥','📺','📻','📡','🔋','🔌','📁','📂','🗂️','📦','🔑','🔒','🔓','🔔','🔕','🛎️','🧲','⚙️','🔧','🔨','🪛','🔬','🔭','💊','💉','🩺','🩹'] },
  { label: 'Símbolos', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✅','❌','⚠️','🚫','💡','📌','📎','🔹','🔸','▶️','◀️','⏩','⏪','✔️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷','🔔','💬','💭','🗯️','🔥','⚡','💥','❓','❗','ℹ️','🆕','🆒','🆓','🔛','🔝','🔜'] },
]

export default function ManifestacaoRichEditor({ value, onChange, placeholder, disabled }) {
  const lastEmitted = useRef('')
  const [emojiAberto, setEmojiAberto] = useState(false)
  const [coresAberto, setCoresAberto] = useState(false)
  const emojiRef = useRef(null)
  const coresRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextStyle,
      Color,
      LinkExt.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastEmitted.current = html
      onChange(html)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (value === lastEmitted.current) return
    if (value !== editor.getHTML()) editor.commands.setContent(value || '', false)
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!emojiAberto) return
    const handle = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiAberto(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [emojiAberto])

  useEffect(() => {
    if (!coresAberto) return
    const handle = (e) => { if (coresRef.current && !coresRef.current.contains(e.target)) setCoresAberto(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [coresAberto])

  const inserirLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('URL do link:', prev)
    if (url === null) return
    if (url === '') editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: url }).run()
  }

  const aplicarCor = (cor) => {
    if (!editor) return
    if (cor) editor.chain().focus().setColor(cor).run()
    else editor.chain().focus().unsetColor().run()
    setCoresAberto(false)
  }

  const corAtual = editor?.getAttributes('textStyle')?.color || null

  const btn = (active) =>
    `p-1.5 rounded transition-colors disabled:opacity-40 ${active ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`

  if (!editor) return null

  return (
    <div className={`manifestacao-editor border border-slate-200 rounded-md overflow-visible ${disabled ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-100 bg-slate-50 rounded-t-md flex-wrap">
        <button type="button" disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Negrito"><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Itálico"><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Sublinhado"><Underline className="h-3.5 w-3.5" /></button>

        {/* Cor do texto */}
        <div className="relative" ref={coresRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCoresAberto(v => !v)}
            className={btn(coresAberto)}
            title="Cor do texto"
          >
            <span className="flex flex-col items-center leading-none">
              <CaseSensitive className="h-3.5 w-3.5" />
              <span className="h-0.5 w-3.5 rounded-sm mt-0.5" style={{ backgroundColor: corAtual || '#0f172a' }} />
            </span>
          </button>
          {coresAberto && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-44">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Cor do texto</p>
              <div className="grid grid-cols-5 gap-1">
                {CORES.map(c => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => aplicarCor(c.value)}
                    title={c.label}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c.value || '#ffffff',
                      borderColor: corAtual === c.value ? '#2563eb' : '#e2e8f0',
                    }}
                  >
                    {!c.value && <span className="text-[8px] text-slate-400 font-bold">A</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Marcadores"><List className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Lista numerada"><ListOrdered className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" disabled={disabled} onClick={inserirLink} className={btn(editor.isActive('link'))} title="Link"><LinkIcon className="h-3.5 w-3.5" /></button>

        {/* Emoji */}
        <div className="relative" ref={emojiRef}>
          <button type="button" disabled={disabled} onClick={() => setEmojiAberto(v => !v)} className={btn(emojiAberto)} title="Emoji">
            <span className="text-sm leading-none">😊</span>
          </button>
          {emojiAberto && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-80 max-h-72 overflow-y-auto">
              {EMOJI_CATEGORIAS.map(cat => (
                <div key={cat.label} className="mb-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 px-0.5">{cat.label}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {cat.emojis.map(em => (
                      <button key={em} type="button" onClick={() => { editor.chain().focus().insertContent(em).run(); setEmojiAberto(false) }}
                        className="text-base hover:bg-slate-100 rounded p-0.5 transition-colors leading-none" title={em}>
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
