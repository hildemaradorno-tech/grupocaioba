import React, { useEffect, useMemo, useState } from 'react'
import { X, Download, AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react'
import SeletorEmpresasAgrupado from '../components/SeletorEmpresasAgrupado'
import { apiService } from '../services/api'

// Base de dados aberta de feriados brasileiros (nacionais, estaduais e municipais),
// publicada como arquivos JSON estáticos no GitHub — sem chave de API, sem limite de uso.
// https://github.com/joaopbini/feriados-brasil
const BASE_URL = 'https://raw.githubusercontent.com/joaopbini/feriados-brasil/master/dados'

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const calcDiaSemana = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}
const fmtData = (iso) => iso ? iso.split('-').reverse().join('/') : '-'

const parseDataBR = (s) => {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// A base não marca se um feriado muda de data todo ano (Carnaval, Sexta-Feira Santa, Corpus
// Christi...) — identifica pelo nome pra já importar classificado como MÓVEL.
const REGEX_MOVEL = /sexta[\s-]*feira\s*santa|sexta[\s-]*feira\s*da\s*paix[ãa]o|corpus\s*christi|carnaval|domingo\s*de\s*p[áa]scoa|^p[áa]scoa$/i

const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao buscar dados (${res.status}) — verifique sua conexão.`)
  return res.json()
}

const BADGE_STATUS = {
  novo:     { label: 'Novo', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  parcial:  { label: 'Completa empresas', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completo: { label: 'Já existe', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}
const BADGE_TIPO = {
  NACIONAL:  'bg-blue-100 text-blue-700 border border-blue-200',
  ESTADUAL:  'bg-violet-100 text-violet-700 border border-violet-200',
  MUNICIPAL: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const INP = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
const BTN_PRI = 'inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_SEC = 'inline-flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'

// Importa feriados Nacionais/Estaduais/Municipais do repositório público joaopbini/feriados-
// brasil pras empresas escolhidas. Compara contra os feriados já cadastrados (mesma data +
// descrição) — só cria o que falta, nas empresas que ainda não têm aquele feriado; nunca
// altera ou remove nada do que já existe.
export default function ImportarFeriadosModal({ empresas, ocorrencias, anoPadrao, onClose, onImportado }) {
  const [ano, setAno] = useState(anoPadrao)
  const [tipoNacional, setTipoNacional] = useState(true)
  const [tipoEstadual, setTipoEstadual] = useState(false)
  const [tipoMunicipal, setTipoMunicipal] = useState(false)

  const [estados, setEstados] = useState([])
  const [uf, setUf] = useState('')
  const [municipios, setMunicipios] = useState([])
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false)
  const [cidadeIbge, setCidadeIbge] = useState('')

  const [empresaIds, setEmpresaIds] = useState([])

  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState(null)
  const [resultado, setResultado] = useState(null) // [{ key, data_feriado, descricao, tipo_feriado, tipo_data, status, faltam }]
  const [selecionadas, setSelecionadas] = useState(new Set())

  const [importando, setImportando] = useState(false)
  const [erroImportar, setErroImportar] = useState(null)

  useEffect(() => {
    fetchJson(`${BASE_URL}/localizacao/estados/estados.json`)
      .then(setEstados)
      .catch(() => {}) // sem UF, os checkboxes de Estadual/Municipal simplesmente não liberam
  }, [])

  useEffect(() => {
    if (!tipoMunicipal || municipios.length > 0 || carregandoMunicipios) return
    setCarregandoMunicipios(true)
    fetchJson(`${BASE_URL}/localizacao/municipios/municipios.json`)
      .then(setMunicipios)
      .catch(err => setErroBusca(err.message || String(err)))
      .finally(() => setCarregandoMunicipios(false))
  }, [tipoMunicipal, municipios.length, carregandoMunicipios])

  const ufPorCodigo = useMemo(() => Object.fromEntries(estados.map(e => [e.codigo_uf, e.uf])), [estados])
  const cidadesDoEstado = useMemo(() => {
    if (!uf) return []
    return municipios
      .filter(m => ufPorCodigo[m.codigo_uf] === uf)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [municipios, uf, ufPorCodigo])

  // Trocar o Estado invalida a Cidade escolhida (é de outro estado).
  useEffect(() => { setCidadeIbge('') }, [uf])

  const buscar = async () => {
    setErroBusca(null)
    if (!tipoNacional && !tipoEstadual && !tipoMunicipal) { setErroBusca('Marque pelo menos um tipo de feriado.'); return }
    if ((tipoEstadual || tipoMunicipal) && !uf) { setErroBusca('Selecione o Estado.'); return }
    if (tipoMunicipal && !cidadeIbge) { setErroBusca('Selecione a Cidade.'); return }
    if (empresaIds.length === 0) { setErroBusca('Selecione pelo menos uma Empresa.'); return }

    setBuscando(true)
    setResultado(null)
    try {
      const [nac, est, mun] = await Promise.all([
        tipoNacional ? fetchJson(`${BASE_URL}/feriados/nacional/json/${ano}.json`) : Promise.resolve([]),
        tipoEstadual ? fetchJson(`${BASE_URL}/feriados/estadual/json/${ano}.json`) : Promise.resolve([]),
        tipoMunicipal ? fetchJson(`${BASE_URL}/feriados/municipal/json/${ano}.json`) : Promise.resolve([]),
      ])
      const brutos = [
        ...nac,
        ...est.filter(x => x.uf === uf),
        ...mun.filter(x => String(x.codigo_ibge) === String(cidadeIbge)),
      ]

      const vistos = new Set()
      const linhas = []
      for (const b of brutos) {
        const iso = parseDataBR(b.data)
        const descricao = String(b.nome || '').trim().toUpperCase()
        if (!iso || !descricao) continue
        const chaveUnica = `${iso}|${descricao}`
        if (vistos.has(chaveUnica)) continue
        vistos.add(chaveUnica)

        const tipoData = REGEX_MOVEL.test(b.nome || '') ? 'MÓVEL' : 'FIXA'
        // "Já existe" casa só pela DATA (+ ser um Feriado de verdade, não Parada Parcial/Total)
        // — ignora o texto, porque a fonte externa às vezes nomeia diferente do que já está
        // cadastrado pro mesmo dia (ex.: "Ano Novo" aqui vs "Confraternização Universal" no
        // cadastro). Se já existe algo nesse dia, reaproveita a descrição/tipos já cadastrados
        // pras empresas que faltam, em vez de criar um nome novo para o mesmo feriado.
        const ocorrenciasNoDia = ocorrencias.filter(o => o.data_feriado === iso && o.tipo_pausa === 'FERIADO')
        const ocorrenciaBase = ocorrenciasNoDia[0] || null
        const jaCobertas = new Set(ocorrenciasNoDia.flatMap(o => o.registros.map(r => r.empresa_id)))
        const faltam = empresaIds.filter(id => !jaCobertas.has(id))

        linhas.push({
          key: chaveUnica,
          data_feriado: iso,
          descricao: ocorrenciaBase?.descricao || descricao,
          descricaoImportada: descricao,
          tipo_feriado: ocorrenciaBase?.tipo_feriado || b.tipo,
          tipo_data: ocorrenciaBase?.tipo_data || tipoData,
          status: faltam.length === 0 ? 'completo' : jaCobertas.size === 0 ? 'novo' : 'parcial',
          faltam,
        })
      }
      linhas.sort((a, b) => a.data_feriado.localeCompare(b.data_feriado) || a.descricao.localeCompare(b.descricao))
      setResultado(linhas)
      setSelecionadas(new Set(linhas.filter(l => l.status !== 'completo').map(l => l.key)))
    } catch (err) {
      setErroBusca(err.message || String(err))
    } finally {
      setBuscando(false)
    }
  }

  const toggleLinha = (key) => setSelecionadas(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const importaveis = (resultado || []).filter(l => l.status !== 'completo')
  const todasMarcadas = importaveis.length > 0 && importaveis.every(l => selecionadas.has(l.key))
  const toggleTodas = () => setSelecionadas(todasMarcadas ? new Set() : new Set(importaveis.map(l => l.key)))
  const qtdSelecionadas = importaveis.filter(l => selecionadas.has(l.key)).length

  const importar = async () => {
    setImportando(true)
    setErroImportar(null)
    try {
      const empresasPorId = new Map(empresas.map(e => [e.id, { id: e.id, nome: nomeEmpresa(e) }]))
      const linhas = importaveis.filter(l => selecionadas.has(l.key))
      for (const l of linhas) {
        const base = {
          data_feriado: l.data_feriado,
          dia_semana: calcDiaSemana(l.data_feriado),
          descricao: l.descricao,
          tipo_pausa: 'FERIADO',
          tipo_feriado: l.tipo_feriado,
          tipo_data: l.tipo_data,
          ano,
        }
        const empresasAlvo = l.faltam.map(id => empresasPorId.get(id)).filter(Boolean)
        await apiService.createFeriadoEmpresas(base, empresasAlvo)
      }
      await onImportado()
    } catch (err) {
      setErroImportar(err.message || String(err))
      setImportando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Download size={18} className="text-indigo-600" /> Importar Feriados
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Busca feriados prontos (base pública <strong>joaopbini/feriados-brasil</strong>, via GitHub) e cria só o que ainda não está cadastrado,
            nas empresas que você escolher. Nada existente é alterado ou removido.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LBL}>Ano</label>
              <input type="number" className={INP} value={ano} onChange={e => setAno(Number(e.target.value) || anoPadrao)} />
            </div>
            <div className="col-span-2">
              <label className={LBL}>Tipos de feriado</label>
              <div className="flex items-center gap-4 h-[38px]">
                <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={tipoNacional} onChange={e => setTipoNacional(e.target.checked)} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                  Nacionais
                </label>
                <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={tipoEstadual} onChange={e => setTipoEstadual(e.target.checked)} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                  Estaduais
                </label>
                <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer select-none">
                  <input type="checkbox" checked={tipoMunicipal} onChange={e => setTipoMunicipal(e.target.checked)} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                  Municipais
                </label>
              </div>
            </div>
          </div>

          {(tipoEstadual || tipoMunicipal) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Estado</label>
                <select className={INP} value={uf} onChange={e => setUf(e.target.value)}>
                  <option value="">Selecione...</option>
                  {estados.map(e => <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>)}
                </select>
              </div>
              {tipoMunicipal && (
                <div>
                  <label className={LBL}>Cidade</label>
                  <select className={INP} value={cidadeIbge} onChange={e => setCidadeIbge(e.target.value)} disabled={!uf || carregandoMunicipios}>
                    <option value="">{carregandoMunicipios ? 'Carregando cidades...' : !uf ? 'Selecione o Estado primeiro' : 'Selecione...'}</option>
                    {cidadesDoEstado.map(c => <option key={c.codigo_ibge} value={c.codigo_ibge}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={LBL}>Empresas em que os feriados encontrados devem aparecer *</label>
            <SeletorEmpresasAgrupado empresas={empresas} selecionados={empresaIds} onChange={setEmpresaIds} />
          </div>

          {erroBusca && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              <AlertTriangle size={15} className="shrink-0" /> {erroBusca}
            </div>
          )}

          <button onClick={buscar} disabled={buscando} className={`${BTN_PRI} w-full`}>
            {buscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {buscando ? 'Buscando...' : 'Buscar Feriados'}
          </button>

          {resultado && (
            resultado.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum feriado encontrado para esses filtros.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold">
                    <input type="checkbox" checked={todasMarcadas} onChange={toggleTodas} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                    Selecionar todos importáveis
                  </label>
                  <span>{resultado.length} feriado(s) encontrado(s) · {qtdSelecionadas} selecionado(s)</span>
                </div>
                <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {resultado.map(l => {
                    const badge = BADGE_STATUS[l.status]
                    const desabilitado = l.status === 'completo'
                    return (
                      <label key={l.key} className={`flex items-center gap-3 px-3 py-2 text-sm ${desabilitado ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          disabled={desabilitado}
                          checked={selecionadas.has(l.key)}
                          onChange={() => toggleLinha(l.key)}
                          className="w-3.5 h-3.5 rounded accent-indigo-600 shrink-0"
                        />
                        <span className="font-mono text-xs text-slate-600 w-20 shrink-0">{fmtData(l.data_feriado)}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-slate-700 truncate" title={l.descricao}>{l.descricao}</span>
                          {l.descricaoImportada !== l.descricao && (
                            <span className="block text-[10px] text-amber-600 truncate" title={`A fonte chama de "${l.descricaoImportada}" — mantendo o nome já cadastrado`}>
                              Já cadastrado como acima (fonte chama de "{l.descricaoImportada}")
                            </span>
                          )}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${BADGE_TIPO[l.tipo_feriado] || 'bg-slate-100 text-slate-600'}`}>{l.tipo_feriado}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.cls}`} title={l.status === 'parcial' ? `Já existe em algumas empresas — vai completar em ${l.faltam.length}` : undefined}>
                          {badge.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          )}

          {erroImportar && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              <AlertTriangle size={15} className="shrink-0" /> {erroImportar}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className={`${BTN_SEC} flex-1`} disabled={importando}>Cancelar</button>
          <button onClick={importar} className={`${BTN_PRI} flex-1`} disabled={importando || qtdSelecionadas === 0}>
            {importando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {importando ? 'Importando...' : `Importar (${qtdSelecionadas})`}
          </button>
        </div>
      </div>
    </div>
  )
}
