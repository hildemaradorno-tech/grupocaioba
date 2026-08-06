import React, { useEffect, useState, useMemo } from 'react'
import { Palmtree, Loader2, AlertTriangle, CheckCircle2, DownloadCloud, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, X } from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { buscaComCoringa } from '../utils/buscaTexto'

const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[180px]'

const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}
const fmtDataHora = (v) => v ? new Date(v).toLocaleString('pt-BR') : '-'

// O arquivo do RH traz o CNPJ só com dígitos ("18482907000108"); no cadastro de Empresas ele
// pode estar formatado ("18.482.907/0001-08") — compara sempre pelos dígitos.
const soDigitos = (v) => String(v || '').replace(/\D/g, '')

export default function Ferias() {
  const { user, hasPermission } = useAuth()
  const canEdit = hasPermission('ferias', 'editar')
  const usuarioLabel = user?.email || 'desconhecido'

  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [ultimaImportacao, setUltimaImportacao] = useState(null)
  const [infoArquivo, setInfoArquivo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [importando, setImportando] = useState(false)
  const [resultadoSync, setResultadoSync] = useState(null)

  const [filtroNome, setFiltroNome] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroCcustos, setFiltroCcustos] = useState('')
  const [filtroFantasia, setFiltroFantasia] = useState('')
  const [filtroMes, setFiltroMes] = useState('') // 'AAAA-MM' — quem está de férias nesse mês
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [ordenacao, setOrdenacao] = useState({ coluna: 'inicio', direcao: 'desc' })

  const jaImportado = dados.length > 0

  const loadData = async () => {
    setLoading(true)
    setErro(null)
    try {
      const [ferias, ultima, emps] = await Promise.all([
        apiService.getFerias(),
        apiService.getUltimaImportacaoFerias(),
        apiService.getEmpresas(),
      ])
      setDados(ferias)
      setUltimaImportacao(ultima)
      setEmpresas(emps)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Data de modificação do arquivo de férias no SharePoint (só metadado, não baixa o arquivo) —
  // mostrada junto do aviso de "já importado" pra dar pra comparar com a última importação sem
  // precisar abrir o arquivo (best-effort: falha aqui não pode derrubar a tela).
  useEffect(() => {
    apiService.getInfoArquivoFerias().then(setInfoArquivo).catch(() => setInfoArquivo(null))
  }, [])

  // Importar e Reprocessar usam a MESMA sincronização (insere novos, remove os que sumiram do
  // arquivo) — o que muda é só o rótulo registrado no log e o texto dos avisos.
  const handleSincronizar = async (acao) => {
    setImportando(true)
    setErro(null)
    setResultadoSync(null)
    try {
      const { linhas } = await apiService.lerArquivoFerias()
      if (!linhas || linhas.length === 0) throw new Error('O arquivo de férias do SharePoint está vazio.')
      const resultado = await apiService.sincronizarFerias(linhas, usuarioLabel, acao)
      setResultadoSync({ acao, ...resultado })
      await loadData()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setImportando(false)
    }
  }

  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  // Nome Fantasia resolvido pelo CNPJ (dígitos) no cadastro de Empresas.
  const fantasiaPorCnpj = useMemo(() => {
    const mapa = {}
    for (const e of empresas) {
      const digitos = soDigitos(e.cnpj)
      if (digitos) mapa[digitos] = e.empresa_fantasia || e.nome_empresa || null
    }
    return mapa
  }, [empresas])

  const nomeFantasia = (item) => fantasiaPorCnpj[soDigitos(item.cnpj_empresa)] || null

  // Filtros dinâmicos (facetados) — as opções de cada seletor consideram os OUTROS filtros
  // ativos, menos o dele mesmo: mesmo padrão do Cálculo de Comissões.
  // "De férias no mês": o período de gozo cruza o mês escolhido — começou antes do fim do mês
  // E termina depois do início dele (pega também férias que começam num mês e acabam no outro).
  const estaDeFeriasNoMes = (d, mes) => {
    if (!d.inicio_gozo || !d.fim_gozo) return false
    const [ano, m] = mes.split('-').map(Number)
    const ultimoDia = new Date(ano, m, 0).getDate()
    const mesIni = `${mes}-01`
    const mesFim = `${mes}-${String(ultimoDia).padStart(2, '0')}`
    return d.inicio_gozo <= mesFim && d.fim_gozo >= mesIni
  }

  const filtrarDados = useMemo(() => (ignorar) => dados.filter(d => {
    if (ignorar !== 'nome' && filtroNome && !buscaComCoringa(d.nome, filtroNome)) return false
    if (ignorar !== 'cargo' && filtroCargo && (d.nome_cargo || '') !== filtroCargo) return false
    if (ignorar !== 'ccustos' && filtroCcustos && (d.nome_ccustos || '') !== filtroCcustos) return false
    if (ignorar !== 'fantasia' && filtroFantasia && (nomeFantasia(d) || '') !== filtroFantasia) return false
    if (ignorar !== 'mes' && filtroMes && !estaDeFeriasNoMes(d, filtroMes)) return false
    return true
  }), [dados, filtroNome, filtroCargo, filtroCcustos, filtroFantasia, filtroMes, fantasiaPorCnpj])

  const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const cargosUnicos = useMemo(() => juntaUnicos(filtrarDados('cargo').map(d => d.nome_cargo)), [filtrarDados])
  const ccustosUnicos = useMemo(() => juntaUnicos(filtrarDados('ccustos').map(d => d.nome_ccustos)), [filtrarDados])
  const fantasiasUnicas = useMemo(() => juntaUnicos(filtrarDados('fantasia').map(d => nomeFantasia(d))), [filtrarDados, fantasiaPorCnpj])

  // Seleção que ficou sem opção depois de mudar outro filtro é limpa automaticamente.
  useEffect(() => {
    if (filtroCargo && !cargosUnicos.includes(filtroCargo)) setFiltroCargo('')
    if (filtroCcustos && !ccustosUnicos.includes(filtroCcustos)) setFiltroCcustos('')
    if (filtroFantasia && !fantasiasUnicas.includes(filtroFantasia)) setFiltroFantasia('')
  }, [cargosUnicos, ccustosUnicos, fantasiasUnicas])

  const temFiltroAtivo = !!(filtroNome || filtroCargo || filtroCcustos || filtroFantasia || filtroMes)
  const limparFiltros = () => { setFiltroNome(''); setFiltroCargo(''); setFiltroCcustos(''); setFiltroFantasia(''); setFiltroMes('') }

  const dadosExibidos = useMemo(() => {
    const filtrados = filtrarDados(null)
    const dir = ordenacao.direcao === 'desc' ? -1 : 1
    const comparadores = {
      codigo: (a, b) => dir * ((a.codigo_empregado ?? 0) - (b.codigo_empregado ?? 0)),
      nome: (a, b) => dir * (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
      cargo: (a, b) => dir * (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR'),
      ccustos: (a, b) => dir * (a.nome_ccustos || '').localeCompare(b.nome_ccustos || '', 'pt-BR'),
      inicio: (a, b) => dir * (a.inicio_gozo || '').localeCompare(b.inicio_gozo || ''),
      fim: (a, b) => dir * (a.fim_gozo || '').localeCompare(b.fim_gozo || ''),
      fantasia: (a, b) => dir * (nomeFantasia(a) || '').localeCompare(nomeFantasia(b) || '', 'pt-BR'),
    }
    return [...filtrados].sort(comparadores[ordenacao.coluna] || (() => 0))
  }, [filtrarDados, ordenacao, fantasiaPorCnpj])

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="p-6 space-y-4 max-w-[1700px]">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-emerald-600" />
            Férias
          </h1>
          <p className="text-xs text-slate-500">
            Férias calculadas importadas do arquivo do RH no SharePoint. A importação vale pra todos os gerentes — feita uma vez, não precisa repetir.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => handleSincronizar(jaImportado ? 'REPROCESSAR' : 'IMPORTAR')}
            disabled={importando}
            title={jaImportado
              ? 'Relê o arquivo do SharePoint: adiciona registros novos e remove os que não existem mais no arquivo'
              : 'Lê o arquivo do SharePoint e salva tudo no banco de dados'}
            className={`flex items-center gap-2 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${jaImportado ? 'bg-slate-600 hover:bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : jaImportado ? <RefreshCw className="h-4 w-4" /> : <DownloadCloud className="h-4 w-4" />}
            {importando ? 'Lendo arquivo...' : jaImportado ? 'Reprocessar' : 'Importar'}
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* AVISO: banco já importado — outro gerente não precisa refazer */}
      {jaImportado && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-emerald-800 text-xs leading-relaxed">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Banco já importado</strong> — {dados.length} registro(s) de férias no sistema.
            {ultimaImportacao && (
              <> Última {ultimaImportacao.acao === 'REPROCESSAR' ? 'reprocessamento' : 'importação'} por <strong>{ultimaImportacao.usuario}</strong> em {fmtDataHora(ultimaImportacao.data_hora)}.</>
            )}
            {infoArquivo?.dataModificacao && (
              <> Arquivo do RH modificado em <strong>{fmtDataHora(infoArquivo.dataModificacao)}</strong>.</>
            )}
            {' '}Não é preciso importar de novo — use Reprocessar só se o arquivo do RH mudou.
          </span>
        </div>
      )}

      {/* Resultado da última sincronização feita agora */}
      {resultadoSync && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-800 text-xs leading-relaxed">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {resultadoSync.acao === 'REPROCESSAR' ? 'Reprocessamento concluído' : 'Importação concluída'}:
            {' '}<strong>{resultadoSync.novos}</strong> registro(s) novo(s) adicionado(s)
            {resultadoSync.acao === 'REPROCESSAR' && <>, <strong>{resultadoSync.removidos}</strong> removido(s) por não existirem mais no arquivo</>}.
          </span>
        </div>
      )}

      {/* FILTROS AVANÇADOS — retrátil, começa fechado; seletores dinâmicos entre si */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltrosAbertos(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className={LBL}>Filtros Avançados</span>
          {temFiltroAtivo && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>}
          <span className="ml-auto text-[11px] text-slate-400">{dadosExibidos.length} de {dados.length} registro(s)</span>
        </button>
        {filtrosAbertos && (
          <div className="flex flex-col gap-2 px-4 pb-4 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={filtroFantasia} onChange={e => setFiltroFantasia(e.target.value)} className={SEL}>
                <option value="">Todas as Empresas</option>
                {fantasiasUnicas.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className={SEL}>
                <option value="">Todos os Cargos</option>
                {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filtroCcustos} onChange={e => setFiltroCcustos(e.target.value)} className={SEL}>
                <option value="">Todos os Centros de Custo</option>
                {ccustosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">De férias em</label>
                <input
                  type="month"
                  value={filtroMes}
                  onChange={e => setFiltroMes(e.target.value)}
                  title="Mostra quem está de férias (total ou parcialmente) dentro do mês escolhido"
                  className="text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              {temFiltroAtivo && (
                <button onClick={limparFiltros} className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors">
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={filtroNome}
                onChange={e => setFiltroNome(e.target.value)}
                placeholder="Buscar funcionário..."
                className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[200px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
              <th className="p-3 w-20">
                <button onClick={() => alternarOrdenacao('codigo')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Código {iconeOrdenacao('codigo')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('nome')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Funcionário {iconeOrdenacao('nome')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('cargo')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Cargo {iconeOrdenacao('cargo')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('ccustos')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Centro de Custo {iconeOrdenacao('ccustos')}
                </button>
              </th>
              <th className="p-3 w-32">
                <button onClick={() => alternarOrdenacao('inicio')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Início Gozo {iconeOrdenacao('inicio')}
                </button>
              </th>
              <th className="p-3 w-32">
                <button onClick={() => alternarOrdenacao('fim')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Fim Gozo {iconeOrdenacao('fim')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('fantasia')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Nome Fantasia {iconeOrdenacao('fantasia')}
                </button>
              </th>
              <th className="p-3 w-36">CNPJ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosExibidos.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-6 text-center text-slate-400">
                  {dados.length === 0
                    ? 'Nenhuma férias importada ainda — clique em Importar pra trazer os dados do arquivo do RH.'
                    : 'Nenhum registro encontrado pro filtro aplicado.'}
                </td>
              </tr>
            ) : dadosExibidos.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 whitespace-nowrap">{item.codigo_empregado ?? '-'}</td>
                <td className="p-3 whitespace-nowrap">{item.nome}</td>
                <td className="p-3 whitespace-nowrap">
                  {item.nome_cargo || '-'}
                  {item.codigo_cargo != null && <span className="text-slate-400"> ({item.codigo_cargo})</span>}
                </td>
                <td className="p-3 whitespace-nowrap">{item.nome_ccustos || '-'}</td>
                <td className="p-3 whitespace-nowrap">{fmtDate(item.inicio_gozo)}</td>
                <td className="p-3 whitespace-nowrap">{fmtDate(item.fim_gozo)}</td>
                <td className="p-3 whitespace-nowrap">{nomeFantasia(item) || <span className="text-slate-300">não cadastrada</span>}</td>
                <td className="p-3 whitespace-nowrap">{item.cnpj_empresa || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
