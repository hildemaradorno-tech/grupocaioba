import React, { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Plus as PlusIcon, Link2, Download } from 'lucide-react'
import { apiService } from '../../services/api'
import { INPUT, LABEL } from './ControladoriaNav'
import SeletorEmpresas from './SeletorEmpresas'

const norm = (v) => String(v ?? '').trim()
const semAcento = (s) => norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const achaColuna = (cabecalho, nomes) => cabecalho.find(c => nomes.includes(semAcento(c)))

export default function ImportarCentrosResultadoModal({ centros, sistemas, empresas = [], onClose, onImported }) {
  const fileRef = useRef(null)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [arrastando, setArrastando] = useState(false)
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState([])
  const [sistemaId, setSistemaId] = useState('')
  // Empresas em que os centros do arquivo existem (uma linha por centro × empresa no Supabase).
  const [empresaIds, setEmpresaIds] = useState([])
  const [semSigla, setSemSigla] = useState([]) // linhas ignoradas por estarem sem Sigla/Fisco

  // Modelo .xlsx: cabeçalho certo e as células já formatadas como Texto (formato "@"), pra o Excel
  // não tirar zero à esquerda do código (ex.: 001) nem converter em número.
  const baixarModelo = () => {
    const colunas = ['Código', 'Descrição', 'Sigla/Fisco']
    const ws = {}
    colunas.forEach((nome, c) => { ws[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: nome, z: '@' } })
    for (let r = 1; r <= 500; r++) {
      colunas.forEach((_, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: '', z: '@' } })
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 500, c: colunas.length - 1 } })
    ws['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Centros de Resultado')
    // cellStyles: sem isso o formato "@" (Texto) não é gravado no arquivo.
    XLSX.writeFile(wb, 'modelo_centros_resultado.xlsx', { cellStyles: true })
  }
  const [resultado, setResultado] = useState(null)

  // Um centro é identificado por sistema + código + sigla: mesmo código e mesma sigla = mesmo centro
  // (a empresa nova é acrescentada nele, mesmo que a descrição venha diferente — a cadastrada é mantida).
  // A importação nunca altera os dados de um centro existente; só cria o que falta e liga empresas.
  const chaveCentro = (codigo, sigla) => `${norm(codigo)}|${(norm(sigla) || norm(codigo)).toUpperCase()}`
  const centrosDoSistema = useMemo(
    () => centros.filter(c => (c.sistema_id || '') === sistemaId),
    [centros, sistemaId]
  )

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        // raw:false devolve o texto exibido na célula (preserva zeros à esquerda, ex.: "001"); código, descrição e sigla ficam sempre como texto.
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false })
        if (raw.length === 0) { setErroArquivo('O arquivo está vazio ou não possui dados.'); return }
        const cabecalho = Object.keys(raw[0])
        const colCodigo = achaColuna(cabecalho, ['codigo', 'cod'])
        const colDescricao = achaColuna(cabecalho, ['descricao', 'desc'])
        const colSigla = achaColuna(cabecalho, ['sigla/fisco', 'sigla / fisco', 'sigla fisco', 'sigla', 'fisco'])
        const faltando = [!colCodigo && 'Código', !colDescricao && 'Descrição', !colSigla && 'Sigla/Fisco'].filter(Boolean)
        if (faltando.length > 0) { setErroArquivo(`Colunas não encontradas no arquivo: ${faltando.join(', ')}\nUse o botão "Baixar modelo" para pegar a planilha no formato certo.`); return }

        const vistos = new Set()
        const lista = []
        const ignoradas = [] // linhas com código e descrição, mas sem Sigla/Fisco (obrigatória)
        for (const r of raw) {
          const codigo = norm(r[colCodigo])
          const descricao = norm(r[colDescricao])
          if (!codigo || !descricao) continue
          const sigla = norm(r[colSigla]).toUpperCase()
          if (!sigla) { ignoradas.push(`${codigo} — ${descricao}`); continue }
          // Mesmo código + sigla repetido no arquivo: fica a primeira linha.
          const chave = chaveCentro(codigo, sigla)
          if (vistos.has(chave)) continue
          vistos.add(chave)
          lista.push({ chave, codigo, descricao, sigla })
        }
        if (lista.length === 0) { setErroArquivo('Nenhuma linha com Código, Descrição e Sigla/Fisco preenchidos.'); return }
        lista.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
        setLinhas(lista)
        setSemSigla(ignoradas)
        setSistemaId('')
        setEtapa('preview')
      } catch (err) {
        setErroArquivo('Erro ao processar o arquivo: ' + (err.message || String(err)))
      }
    }
    reader.readAsBinaryString(file)
  }

  const classificadas = useMemo(() => {
    if (!sistemaId) return []
    const cadastradas = new Map()
    for (const c of centrosDoSistema) {
      const k = chaveCentro(c.codigo, c.sigla)
      if (!cadastradas.has(k)) cadastradas.set(k, c)
    }
    return linhas.map(l => {
      const atual = cadastradas.get(l.chave)
      if (!atual) return { ...l, status: 'novo', faltam: empresaIds }
      // Já existe: só falta ligar às empresas marcadas que ele ainda não tem.
      const faltam = empresaIds.filter(id => !(atual.empresa_ids || []).includes(id))
      return { ...l, atual, faltam, status: faltam.length ? 'vincular' : 'ok' }
    })
  }, [linhas, centrosDoSistema, sistemaId, empresaIds])

  const contagem = classificadas.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc }, {})
  const pendentes = classificadas.filter(l => l.status !== 'ok')

  const handleImportar = async () => {
    setEtapa('importando')
    let criados = 0
    let vinculados = 0
    const erros = []
    for (const l of pendentes) {
      try {
        if (l.status === 'novo') {
          const novo = await apiService.salvarCtbCentroResultado(null, { codigo: l.codigo, descricao: l.descricao, sistema_id: sistemaId, sigla: l.sigla, ativo: true })
          await apiService.vincularEmpresasCtbCentro(novo.id, empresaIds)
          criados++
        } else {
          await apiService.vincularEmpresasCtbCentro(l.atual.id, l.faltam)
          vinculados++
        }
      } catch (err) {
        erros.push(`${l.codigo} — ${l.descricao}: ${err.message || String(err)}`)
      }
    }
    if (criados > 0 || vinculados > 0) onImported?.()
    if (erros.length === 0) { onClose?.(); return }
    setResultado({ criados, vinculados, erros })
    setEtapa('resultado')
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[720px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Centros de Resultado via Excel</h2>
              <p className="text-[11px] text-slate-500">Planilha com as colunas Código e Descrição; todos os itens ficam vinculados ao sistema e às empresas escolhidos.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {etapa === 'selecao' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastando(false); processarArquivo(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${arrastando ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
              >
                <Upload className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Arraste o arquivo Excel aqui</p>
                <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — .xlsx / .xls</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => processarArquivo(e.target.files[0])} />
              </div>
              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas obrigatórias</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Código', 'Descrição', 'Sigla/Fisco'].map(c => (
                        <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">{c}</span>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={baixarModelo} className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Baixar modelo
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">O modelo já vem com essas colunas e as células formatadas como Texto (mantém zero à esquerda, ex.: 001). A coluna Sigla/Fisco também é aceita com o nome Sigla ou Fisco; linha sem Sigla/Fisco não é importada.</p>
              </div>
            </>
          )}

          {etapa === 'preview' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700"><strong>{nomeArquivo}</strong> — {linhas.length} centro(s) de resultado encontrados</p>
              </div>
              {semSigla.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {semSigla.length} linha(s) sem Sigla/Fisco não serão importadas:</p>
                  <div className="max-h-24 overflow-y-auto">
                    {semSigla.map((t, i) => <p key={i} className="text-[11px] text-amber-800">{t}</p>)}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Sistema *</label>
                <select value={sistemaId} onChange={e => setSistemaId(e.target.value)} className={INPUT}>
                  <option value="">Selecione o sistema...</option>
                  {sistemas.filter(s => s.ativo !== false).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <p className="text-[11px] text-slate-400">Compara Sistema + Código + Sigla/Fisco: se já existe um centro com o mesmo código e Sigla/Fisco, as empresas marcadas são acrescentadas nele (mesma linha); senão, cria um centro novo. Os dados dos centros cadastrados não são alterados.</p>
              </div>

              <SeletorEmpresas
                empresas={empresas}
                value={empresaIds}
                onChange={setEmpresaIds}
                sistemaNome={sistemas.find(s => s.id === sistemaId)?.nome}
                obrigatorio
              />
              <p className="text-[11px] text-slate-400 -mt-2">Centro novo é criado já ligado às empresas marcadas; centro que já existe só ganha as empresas que ainda não tem (nenhuma é removida).</p>

              {!sistemaId && (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">Escolha o sistema para ver o que será criado.</div>
              )}

              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                {contagem.novo > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200"><PlusIcon className="h-3 w-3" /> {contagem.novo} novo(s)</span>}
                {contagem.vincular > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200"><Link2 className="h-3 w-3" /> {contagem.vincular} já cadastrado(s), ganha(m) empresa</span>}
                {contagem.ok > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3" /> {contagem.ok} já cadastrado(s)</span>}
              </div>

              {sistemaId && <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 w-28">Código</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-48">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classificadas.map(l => (
                      <tr key={l.chave} className={l.status === 'ok' ? 'opacity-50' : ''}>
                        <td className="p-2 text-[11px] font-mono text-slate-600">{l.codigo}</td>
                        <td className="p-2 text-[11px] font-semibold text-slate-800">
                          {l.descricao}
                          {l.sigla && <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600">{l.sigla}</span>}
                          {l.atual && l.atual.descricao !== l.descricao && (
                            <div className="text-[10px] font-normal text-slate-500">Mesmo código e sigla de <strong>{l.atual.descricao}</strong> — entra nessa mesma linha (a descrição cadastrada é mantida).</div>
                          )}
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">{l.status === 'novo' ? 'Novo' : l.status === 'vincular' ? `Já cadastrado · +${l.faltam.length} empresa(s)` : 'Já cadastrado'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </>
          )}

          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando centros de resultado...</p>
              <p className="text-xs text-slate-400">Não feche esta janela.</p>
            </div>
          )}

          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className="rounded-lg p-4 border bg-amber-50 border-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Importação concluída com avisos</p>
                  <p className="text-xs text-slate-600 mt-0.5"><strong>{resultado.criados}</strong> criado(s) · <strong>{resultado.vinculados}</strong> ligado(s) a mais empresas</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">{resultado.erros.length} erro(s)</p>
                {resultado.erros.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {etapa === 'selecao' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          )}
          {etapa === 'preview' && (
            <>
              <button onClick={() => { setEtapa('selecao'); setLinhas([]) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              {!sistemaId
                ? <span className="text-[11px] text-amber-600 font-semibold">Selecione o sistema</span>
                : empresaIds.length === 0 && <span className="text-[11px] text-amber-600 font-semibold">Marque ao menos uma empresa</span>}
              <button
                onClick={handleImportar}
                disabled={!sistemaId || empresaIds.length === 0 || pendentes.length === 0}
                className={`px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${(!sistemaId || empresaIds.length === 0 || pendentes.length === 0) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                Importar {pendentes.length > 0 ? `(${pendentes.length})` : ''}
              </button>
            </>
          )}
          {etapa === 'resultado' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
          )}
        </div>
      </div>
    </div>
  )
}
