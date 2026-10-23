import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, FileText, AlertTriangle, Save, ImagePlus, X, Wand2, Eye } from 'lucide-react'
import { apiService } from '../../services/api'
import MenuEngrenagem from '../../components/MenuEngrenagem'
import { CAMPOS_NOTA_DEBITO, montarContextoNota, renderizarModelo, comElementoOculto, gerarPdfUrlDeElemento } from '../../utils/notaDebito'
import { MODELOS_PADRAO } from '../../utils/notaDebitoModelosPadrao'
import { useResponsavelNota } from '../../hooks/useResponsavelNota'
import { useAuth } from '../../context/AuthContext'

const VAZIO = { id: null, nome: '', descricao: '', tipos_codigos: '', logo: '', conteudo_html: '', ativo: true }
// tipo_os vem como "G02 - AÇÃO DE CAMPO (MEC)": mostra só a descrição, já que a sigla tem coluna própria
const descricaoTipo = (t) => String(t.tipo_os || '').replace(/^\S+\s*-\s*/, '')
const LIMITE_LOGO = 400 * 1024

export default function ModelosNotaDebito() {
  const responsavel = useResponsavelNota()
  const { hasActionOrDefault } = useAuth()
  const canCriar = hasActionOrDefault('garantia/modelos-nota-debito', 'criar')
  const canEditar = hasActionOrDefault('garantia/modelos-nota-debito', 'editar')
  const canExcluir = hasActionOrDefault('garantia/modelos-nota-debito', 'excluir')
  const [modelos, setModelos] = useState([])
  const [tipos, setTipos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [excluir, setExcluir] = useState(null)
  const [buscaTipo, setBuscaTipo] = useState('')
  const areaRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const [m, t, e] = await Promise.all([
        apiService.getModelosNotaDebito(),
        apiService.getTiposOS(),
        apiService.getEmpresas(),
      ])
      setModelos(m); setTipos(t || []); setEmpresas(e)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const codigosForm = useMemo(
    () => (form?.tipos_codigos || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    [form?.tipos_codigos]
  )
  // Só tipos de O.S. classificados como Garantia; um por sigla (o cadastro tem uma linha por agrupamento).
  const tiposVisiveis = useMemo(() => {
    const q = buscaTipo.trim().toLowerCase()
    const porSigla = new Map()
    tipos.filter(t => t.sigla && t.ativo !== false && (t.classificacao === 'Garantia' || t.tipo_interno === 'Garantia'))
      .forEach(t => { if (!porSigla.has(t.sigla)) porSigla.set(t.sigla, t) })
    return [...porSigla.values()]
      .filter(t => !q || `${t.sigla} ${t.tipo_os || ''}`.toLowerCase().includes(q))
      .sort((a, b) => String(a.sigla).localeCompare(String(b.sigla)))
  }, [tipos, buscaTipo])
  const toggleCodigo = (cod) => {
    const set = new Set(codigosForm)
    if (set.has(cod)) set.delete(cod); else set.add(cod)
    setForm(p => ({ ...p, tipos_codigos: [...set].join(',') }))
  }

  const preview = useMemo(() => {
    if (!form) return ''
    const empresa = empresas.find(e => /TRUCKS/i.test(e.empresa_fantasia || '') && e.cnpj) || empresas.find(e => e.cnpj) || {}
    const ctx = montarContextoNota({
      empresa, garantia: {}, nota: { numero: '0000/0000' }, itens: [{}], logo: form.logo, responsavel,
    })
    return renderizarModelo(form.conteudo_html, ctx)
  }, [form, empresas, responsavel.nome, responsavel.cargo])

  // Abre o PDF do modelo (dados reais da concessionária, processo em branco) em outra aba
  const visualizarPdf = async (m) => {
    setErro(null)
    const aba = window.open('', '_blank') // abre já no clique para o navegador não bloquear
    try {
      const empresa = empresas.find(e => /TRUCKS/i.test(e.empresa_fantasia || '') && e.cnpj) || empresas.find(e => e.cnpj) || {}
      const ctx = montarContextoNota({
        empresa, garantia: {}, nota: { data_emissao: new Date().toISOString().slice(0, 10) }, itens: [{}], logo: m.logo, responsavel,
      })
      const url = await comElementoOculto(renderizarModelo(m.conteudo_html, ctx), gerarPdfUrlDeElemento)
      if (aba) aba.location.href = url; else window.open(url, '_blank')
    } catch (err) {
      if (aba) aba.close()
      setErro(err.message || String(err))
    }
  }

  const inserirCampo = (chave) => {
    const el = areaRef.current
    const marca = `{{${chave}}}`
    if (!el) { setForm(p => ({ ...p, conteudo_html: (p.conteudo_html || '') + marca })); return }
    const ini = el.selectionStart ?? el.value.length
    const fim = el.selectionEnd ?? ini
    const novo = el.value.slice(0, ini) + marca + el.value.slice(fim)
    setForm(p => ({ ...p, conteudo_html: novo }))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(ini + marca.length, ini + marca.length) })
  }

  const onLogo = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > LIMITE_LOGO) { setErro('A logo deve ter até 400 KB.'); return }
    const r = new FileReader()
    r.onload = () => setForm(p => ({ ...p, logo: r.result }))
    r.readAsDataURL(f)
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true); setErro(null)
    try {
      await apiService.salvarModeloNotaDebito(form.id, form)
      await load()
      setForm(null)
    } catch (err) { setErro(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  const criarPadroes = async () => {
    setErro(null)
    try {
      const nomes = new Set(modelos.map(m => m.nome))
      for (const m of MODELOS_PADRAO) {
        if (!nomes.has(m.nome)) await apiService.salvarModeloNotaDebito(null, { ...m, ativo: true })
      }
      await load()
    } catch (err) { setErro(err.message || String(err)) }
  }

  const confirmarExcluir = async () => {
    try { await apiService.deleteModeloNotaDebito(excluir.id); if (form?.id === excluir.id) setForm(null); await load() }
    catch (err) { setErro(err.message || String(err)) }
    finally { setExcluir(null) }
  }

  const campoCls = 'w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'
  const lblCls = 'text-[10px] font-bold text-slate-400 uppercase'

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" /> Modelos de Nota de Débito
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modelos usados em Garantias DAF. Os campos entre {'{{ }}'} são preenchidos automaticamente com os dados do sistema; o que não existir sai em branco.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCriar && (
            <button onClick={() => setForm({ ...VAZIO })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Novo Modelo
            </button>
          )}
          <MenuEngrenagem itens={[canCriar && {
            icon: Wand2, cor: 'text-indigo-600', titulo: 'Criar modelos padrão',
            descricao: 'Cria os dois modelos dos documentos de exemplo, se ainda não existirem',
            onClick: criarPadroes,
          }]} />
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : modelos.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Nenhum modelo cadastrado. Use a engrenagem para criar os modelos padrão ou clique em Novo Modelo.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="p-3">Modelo</th>
                <th className="p-3 w-48">Tipos de garantia</th>
                <th className="p-3 w-20 text-center">Ativo</th>
                <th className="p-3 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {modelos.map(m => (
                <tr key={m.id} className={`hover:bg-slate-50/70 ${form?.id === m.id ? 'bg-indigo-50/50' : ''}`}>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{m.nome}</div>
                    {m.descricao && <div className="text-[11px] text-slate-500">{m.descricao}</div>}
                  </td>
                  <td className="p-3 font-mono">{m.tipos_codigos || '—'}</td>
                  <td className="p-3 text-center">{m.ativo ? 'Sim' : 'Não'}</td>
                  <td className="p-3 text-center">
                    <MenuEngrenagem compacto itens={[
                      { icon: Eye, cor: 'text-slate-600', titulo: 'Visualizar PDF', descricao: 'Abre o modelo em PDF com os dados da concessionária', onClick: () => visualizarPdf(m) },
                      canEditar && { icon: FileText, cor: 'text-blue-600', titulo: 'Editar', onClick: () => setForm({ ...VAZIO, ...m, logo: m.logo || '', descricao: m.descricao || '', tipos_codigos: m.tipos_codigos || '' }) },
                      canExcluir && { icon: Trash2, cor: 'text-red-600', titulo: 'Excluir', onClick: () => setExcluir(m) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <form onSubmit={salvar} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{form.id ? 'Editar Modelo' : 'Novo Modelo'}</h2>
            <button type="button" onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className={lblCls}>Nome *</label>
              <input className={campoCls} required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Nota de Débito — G01, G02 e G04" />
            </div>
            <div className="flex flex-col gap-1">
              <label className={lblCls}>Ativo</label>
              <select className={`${campoCls} bg-white`} value={form.ativo ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, ativo: e.target.value === 'true' }))}>
                <option value="true">Sim</option><option value="false">Não</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 col-span-3">
              <label className={lblCls}>Descrição</label>
              <input className={campoCls} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className={lblCls}>Tipos de O.S. que usam este modelo (cadastro de Tipos de O.S.)</label>
              <input className={campoCls} value={buscaTipo} onChange={e => setBuscaTipo(e.target.value)} placeholder="Filtrar por sigla ou descrição do tipo de O.S...." />
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                {tiposVisiveis.length === 0 ? (
                  <div className="p-2 text-[11px] text-slate-400">Nenhum tipo de O.S. encontrado.</div>
                ) : tiposVisiveis.map(t => (
                  <label key={t.id || t.sigla} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={codigosForm.includes(String(t.sigla).toUpperCase())} onChange={() => toggleCodigo(String(t.sigla).toUpperCase())} />
                    <span className="font-mono font-bold text-slate-700 w-10">{t.sigla}</span>
                    <span className="text-slate-600">{descricaoTipo(t)}</span>
                  </label>
                ))}
              </div>
              {codigosForm.length > 0 && <span className="text-[10px] text-slate-400">Selecionados: {codigosForm.join(', ')}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={lblCls}>Logo (opcional, até 400 KB)</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <ImagePlus className="h-3.5 w-3.5" /> Escolher
                  <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                </label>
                {form.logo && (
                  <>
                    <img src={form.logo} alt="logo" className="h-8 max-w-[90px] object-contain border border-slate-200 rounded" />
                    <button type="button" onClick={() => setForm(p => ({ ...p, logo: '' }))} className="text-[11px] text-red-500 hover:underline">remover</button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={lblCls}>Conteúdo do modelo (HTML)</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 rounded-md p-2 bg-slate-50">
                {CAMPOS_NOTA_DEBITO.map(g => (
                  <div key={g.grupo} className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-full">{g.grupo}</span>
                    {g.campos.map(([chave, rotulo]) => (
                      <button type="button" key={chave} onClick={() => inserirCampo(chave)} title={`{{${chave}}}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700">
                        {rotulo}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <textarea ref={areaRef} value={form.conteudo_html} onChange={e => setForm(p => ({ ...p, conteudo_html: e.target.value }))}
                spellCheck={false}
                className="w-full h-[420px] text-[11px] font-mono p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              <p className="text-[10px] text-slate-400">Clique em um campo para inserir onde está o cursor.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className={lblCls}>Pré-visualização (dados da concessionária reais; processo em branco)</label>
              <div className="border border-slate-200 rounded-md bg-white overflow-auto h-[560px]">
                <div style={{ width: 794, zoom: 0.7 }} dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {salvando ? 'Salvando...' : 'Salvar Modelo'}
            </button>
          </div>
        </form>
      )}

      {excluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 text-xs text-slate-600">
              Excluir o modelo <strong className="text-slate-800">"{excluir.nome}"</strong>? As notas já emitidas continuam registradas.
            </div>
            <div className="flex justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60">Voltar</button>
              <button onClick={confirmarExcluir} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
