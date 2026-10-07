import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Calculator, BookOpen, BarChart2, Loader2, RefreshCw, Info as InfoIcon, Lock, Unlock, Plus, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { sincronizarCampanha } from '../../services/kpiService'
import { useAuth } from '../../context/AuthContext'
import {
  CAMPANHA, REGRAS_PADRAO, faixasDe, trimestreDoMes, atingimentoBlocoMatriz, montarSemanas, pesoSemana, pesoTotal, pctTxt,
  mesclarRegras, metasAprovadasDaUnidade, metaDoConsultor,
} from '../../utils/campanhaPosVenda'

// BI da Campanha de Bônus do Pós-Venda.
//   Regras   = em reconstrução (vazia). As regras vigentes continuam vindo de REGRAS_PADRAO e de
//              fato_campanha_regras (gravadas por mês) e são usadas pela Apuração.
//   Apuração = cada pessoa avaliada nos blocos 1, 2 e 3 da Matriz KPIs, no mês escolhido
//              (ou no trimestre acumulado, no programa trimestral)
// Realizado vem de fato_campanha_diario (1 linha por dia × empresa × pessoa), gravada pelo
// sync da Matriz KPIs no backend — a tela nunca lê o SharePoint, só essa tabela pequena.

const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const MESES = [
  { v: '01', label: 'Janeiro' }, { v: '02', label: 'Fevereiro' }, { v: '03', label: 'Março' },
  { v: '04', label: 'Abril' }, { v: '05', label: 'Maio' }, { v: '06', label: 'Junho' },
  { v: '07', label: 'Julho' }, { v: '08', label: 'Agosto' }, { v: '09', label: 'Setembro' },
  { v: '10', label: 'Outubro' }, { v: '11', label: 'Novembro' }, { v: '12', label: 'Dezembro' },
]
const TH = 'p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400'
const CARD = 'rounded-lg border border-slate-200 bg-white shadow-sm'

const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

const CORES_FUNCAO = {
  consultor: '#2563eb', mecanico: '#0891b2', box: '#64748b', chefe: '#7c3aed', prog: '#d97706', gerente: '#059669',
}

// Fundo de destaque das colunas Realizado Total, Realizado Ticket e Realizado Margem (Meta Total sem cor).
const COR_TOTAL = { meta: '', real: 'bg-blue-50' }
const corPct = (v) => (v >= 1 ? 'text-emerald-700' : v >= 0.8 ? 'text-amber-700' : 'text-red-600')

const normNome = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const PREPOSICOES = ['de', 'da', 'do', 'das', 'dos', 'e']
const nomeProprio = (s) => (s || '').toLowerCase().split(' ')
  .map((w) => (PREPOSICOES.includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')

// Consultores da unidade = funcionários "1 - Trabalhando" no menu Funcionários, da empresa, cargo no agrupamento e departamento
// definidos na regra da função (menu Funcionários).
function consultoresDaUnidade(funcionarios, u) {
  const { agrupamentoCargo, departamento } = CAMPANHA.funcoes.consultor
  return (funcionarios || [])
    .filter((f) => f.empresa_id === u.empresaId && f.agrupamento === agrupamentoCargo
      && (!departamento || f.departamentos.some((d) => normNome(d) === normNome(departamento))))
    .map((f) => ({ id: f.id, nome: nomeProprio(f.nome_funcionario), nomeErp: normNome(f.nome_funcionario), codigo: f.codigo_sistema_bi ? String(f.codigo_sistema_bi).trim() : null }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
// Só participa quem está com Situação do Funcionário = "1 - Trabalhando" no menu Funcionários
// (e sem data de demissão). Afastados (férias, doença…), demitidos e cadastros sem situação ficam fora.
const SITUACAO_TRABALHANDO = '1'
const trabalhando = (f) => String(f.situacao_funcionario ?? '').trim() === SITUACAO_TRABALHANDO && !f.data_demissao

// Funcionários ativos da empresa no agrupamento + departamento da função (menu Funcionários).
function doAgrupamento(funcionarios, u, funcao) {
  const { agrupamentoCargo, departamento } = CAMPANHA.funcoes[funcao]
  const agrupamentos = [].concat(agrupamentoCargo)
  return (funcionarios || []).filter((f) => f.empresa_id === u.empresaId && agrupamentos.includes(f.agrupamento)
    && (!departamento || f.departamentos.some((d) => normNome(d) === normNome(departamento))))
}
// Cargo entra como Mecânico? Regra salva (lista de cargos) ou, sem regra, cargos que começam com "MECÂNICO".
const cargoEhMecanico = (cargo, cargosRegra) => (Array.isArray(cargosRegra)
  ? cargosRegra.includes(normNome(cargo))
  : normNome(cargo).startsWith('MECANICO'))
function mecanicosDaUnidade(funcionarios, u, regras) {
  return doAgrupamento(funcionarios, u, 'mecanico')
    .filter((f) => cargoEhMecanico(f.cargo_nome, regras.funcoes.mecanico.cargos))
    .map((f) => ({ id: f.id, nome: nomeProprio(f.nome_funcionario), nomeErp: normNome(f.nome_funcionario), cargo: f.cargo_nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
// Chefe de Oficina: ativos do agrupamento da função nos cargos marcados para a unidade na regra.
function porCargosDaUnidade(funcionarios, u, regras, funcao) {
  const cargos = regras.funcoes[funcao].cargos?.[u.id] || []
  return doAgrupamento(funcionarios, u, funcao)
    .filter((f) => cargos.includes(normNome(f.cargo_nome)))
    .map((f) => ({ id: f.id, nome: nomeProprio(f.nome_funcionario), cargo: f.cargo_nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
// Gerente Geral de Pós-Vendas: ativos do agrupamento da regra, em qualquer empresa Trucks, nos cargos da regra.
function gerentesGeraisTrucks(funcionarios, regras) {
  const { agrupamento, cargos = [] } = regras.funcoes.gerenteGeral
  const empresas = new Set(CAMPANHA.unidades.map((x) => x.empresaId))
  return (funcionarios || [])
    .filter((f) => empresas.has(f.empresa_id) && f.agrupamento === agrupamento && cargos.includes(normNome(f.cargo_nome)))
    .map((f) => ({ id: f.id, nome: nomeProprio(f.nome_funcionario), cargo: f.cargo_nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export default function BiCampanha() {
  const { user } = useAuth()
  const [aba, setAba] = useState('regras')
  const [unidade, setUnidade] = useState('CG')

  // Período: ano atual + 10 seguintes. Abre no mês atual; funciona para qualquer mês.
  const hoje = new Date()
  const ANOS = useMemo(() => Array.from({ length: 11 }, (_, i) => String(hoje.getFullYear() + i)), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [ano, setAno] = useState(String(hoje.getFullYear()))
  const [mes, setMes] = useState(String(hoje.getMonth() + 1).padStart(2, '0'))
  const nomeMes = MESES.find((m) => m.v === mes)?.label

  // Calendário (fato_calendario) do ano, por unidade — define semanas e dias úteis.
  const [calendarios, setCalendarios] = useState({})
  useEffect(() => {
    let vivo = true
    Promise.all(CAMPANHA.unidades.map((u) => apiService.getCalendario(u.empresaId, Number(ano)).catch(() => [])))
      .then((listas) => { if (vivo) setCalendarios(Object.fromEntries(CAMPANHA.unidades.map((u, i) => [u.id, listas[i] || []]))) })
    return () => { vivo = false }
  }, [ano])

  // Realizado do mês (fato_campanha_diario) e metas do mês (fato_campanha_metas).
  const [diario, setDiario] = useState(null) // null = carregando
  const [metasAprovadas, setMetasAprovadas] = useState(null) // Planejamento de Metas aprovado
  const [erroDados, setErroDados] = useState(null)
  const [recarregar, setRecarregar] = useState(0)
  useEffect(() => {
    let vivo = true
    setDiario(null)
    setErroDados(null)
    Promise.all([
      apiService.getCampanhaDiario(Number(ano), Number(mes)),
      apiService.getCampanhaMetasAprovadas(Number(ano), Number(mes)),
    ])
      .then(([linhas, aprovadas]) => {
        if (!vivo) return
        setDiario(linhas)
        setMetasAprovadas(aprovadas)
      })
      .catch((err) => { if (vivo) { setErroDados(err.message || String(err)); setDiario([]) } })
    return () => { vivo = false }
  }, [ano, mes, recarregar])
  const atualizadoEm = useMemo(
    () => (diario || []).reduce((max, r) => (r.atualizado_em > max ? r.atualizado_em : max), ''),
    [diario],
  )

  // "Atualizar números": roda só o passo da Campanha no backend e relê a tabela.
  const [sincronizando, setSincronizando] = useState(false)
  const [erroSync, setErroSync] = useState(null)
  const atualizarNumeros = async () => {
    setSincronizando(true)
    setErroSync(null)
    try {
      await sincronizarCampanha(Number(ano))
      setRecarregar((n) => n + 1)
    } catch (err) {
      setErroSync(err.message || String(err))
    } finally {
      setSincronizando(false)
    }
  }

  // Regras vigentes da EMPRESA selecionada no mês (fato_campanha_regras, por empresa + mês + ano):
  // as do mês, senão as do último mês salvo da empresa, senão a regra geral, senão o padrão.
  const [regras, setRegras] = useState(REGRAS_PADRAO)
  const [origemRegras, setOrigemRegras] = useState(null) // linha de onde vieram (ano, mes, unidade…)
  useEffect(() => {
    let vivo = true
    apiService.getCampanhaRegras(Number(ano), Number(mes), unidade)
      .then((linha) => { if (vivo) { setRegras(mesclarRegras(REGRAS_PADRAO, linha?.dados)); setOrigemRegras(linha) } })
      .catch(() => { if (vivo) { setRegras(REGRAS_PADRAO); setOrigemRegras(null) } })
    return () => { vivo = false }
  }, [ano, mes, unidade])
  // Grava as regras da empresa selecionada para o mês escolhido (os meses seguintes dela herdam).
  const salvarRegras = async (novas) => {
    await apiService.salvarCampanhaRegras(Number(ano), Number(mes), unidade, novas, user?.email || null)
    setRegras(novas)
    setOrigemRegras({ ano: Number(ano), mes: Number(mes), unidade, atualizado_em: new Date().toISOString(), atualizado_por: user?.email || null })
  }

  const { semanas, semCalendario } = useMemo(
    () => montarSemanas(Number(ano), Number(mes), calendarios, CAMPANHA),
    [ano, mes, calendarios],
  )
  // Todas as metas vêm do Planejamento de Metas aprovado (metasAprovadasDaUnidade).
  const campanha = useMemo(() => ({ ...CAMPANHA, semanas }), [semanas])
  const proximo = new Date(Number(ano), Number(mes), 1)
  const pagamentoTxt = `${MESES[proximo.getMonth()].label}/${proximo.getFullYear()}`

  // Funcionários ativos + agrupamento do cargo + departamentos (null = carregando).
  const [funcionarios, setFuncionarios] = useState(null)
  const [erroFunc, setErroFunc] = useState(null)
  const [nomeEmpresa, setNomeEmpresa] = useState({})
  useEffect(() => {
    (async () => {
      try {
        const [funcs, cargos, empresas, deptos] = await Promise.all([
          apiService.getFuncionarios(), apiService.getCargos(), apiService.getEmpresas(), apiService.getDepartamentos(),
        ])
        setNomeEmpresa(Object.fromEntries(empresas.map((e) => [e.id, e.empresa_fantasia || e.nome_empresa])))
        const agrupamentoDoCargo = Object.fromEntries(cargos.map((c) => [c.id, c.nome_agrupamento_cargo]))
        // Rótulo "DEPARTAMENTO (AGRUPAMENTO)", ex.: "OFICINA (SERVIÇOS)" — mesmo formato do cadastro.
        const rotuloDepto = Object.fromEntries(deptos.map((d) => [
          d.id, d.agrupamento_departamento_nome ? `${d.nome_departamento} (${d.agrupamento_departamento_nome})` : d.nome_departamento,
        ]))
        // Só quem está "1 - Trabalhando" no menu Funcionários.
        setFuncionarios(funcs.filter(trabalhando).map((f) => ({
          ...f,
          agrupamento: agrupamentoDoCargo[f.cargo_id] || '',
          departamentos: (f.departamento_ids || []).map((id) => rotuloDepto[id]).filter(Boolean),
        })))
      } catch (err) {
        setErroFunc(err.message || String(err))
        setFuncionarios([])
      }
    })()
  }, [])

  const ehTrucks = unidade === 'TRUCKS'
  const u = campanha.unidades.find((x) => x.id === unidade) || campanha.unidades[0]
  const consultores = useMemo(() => consultoresDaUnidade(funcionarios, u), [funcionarios, u])
  const metasUnidade = useMemo(() => metasAprovadasDaUnidade(metasAprovadas, u.empresaId), [metasAprovadas, u.empresaId])

  // Blocos 1 e 2 da Matriz KPIs (só existem por trimestre): trimestre do mês escolhido.
  const [kpiBlocos, setKpiBlocos] = useState({})
  useEffect(() => {
    apiService.getKpiCachePlanilhas(['bloco1', 'bloco2']).then(setKpiBlocos).catch(() => setKpiBlocos({}))
  }, [recarregar])
  const qMatriz = trimestreDoMes(mes)
  const blocosMatriz = useMemo(() => ({
    q: qMatriz,
    companhia: atingimentoBlocoMatriz(kpiBlocos.bloco1?.dados, qMatriz),
    departamento: atingimentoBlocoMatriz(kpiBlocos.bloco2?.dados, qMatriz, (r) => /p[oó]s/i.test(r.area || '')),
    pesos: regras.pesosBlocos,
  }), [kpiBlocos, qMatriz, regras.pesosBlocos])

  const mecanicos = useMemo(() => mecanicosDaUnidade(funcionarios, u, regras), [funcionarios, u, regras])
  const chefes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'chefe'), [funcionarios, u, regras])
  const gerentes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'gerente'), [funcionarios, u, regras])

  // CAIOBÁ TRUCKS: Gerente Geral de Pós-Vendas, avaliado em cada unidade separadamente.
  const gerentesGerais = useMemo(() => gerentesGeraisTrucks(funcionarios, regras), [funcionarios, regras])
  const metasPorUnidade = useMemo(
    () => Object.fromEntries(CAMPANHA.unidades.map((x) => [x.id, metasAprovadasDaUnidade(metasAprovadas, x.empresaId)])),
    [metasAprovadas],
  )

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-600" /> BI — Campanha Pós-Venda
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Campanha {nomeMes}/{ano} · {semanas.length} semanas · pagamento em {pagamentoTxt}.
            {' '}Números atualizados em {atualizadoEm ? dataHora(atualizadoEm) : '—'}.
          </p>
          {erroSync && <p className="text-xs text-red-600 mt-1">Não foi possível atualizar os números: {erroSync}</p>}
          {erroDados && <p className="text-xs text-red-600 mt-1">Não foi possível carregar os dados: {erroDados}</p>}
        </div>
        <div className="flex items-end gap-2">
          <button onClick={atualizarNumeros} disabled={sincronizando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Atualizando…' : 'Atualizar números'}
          </button>
          <label className="flex flex-col gap-1">
            <span className={LBL}>Ano</span>
            <select className={SEL} value={ano} onChange={(e) => setAno(e.target.value)}>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LBL}>Mês</span>
            <select className={SEL} value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Empresa selecionada vale para todas as abas */}
      <div className="flex flex-wrap gap-1.5">
        {[{ id: 'TRUCKS', nome: 'CAIOBÁ TRUCKS' }, ...CAMPANHA.unidades].map((x) => (
          <button
            key={x.id}
            onClick={() => setUnidade(x.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              unidade === x.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {nomeEmpresa[x.empresaId] || x.nome}
          </button>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[['regras', 'Regras', BookOpen], ['apuracao', 'Apuração', Calculator], ['resultado', 'Resultado', BarChart2]].map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              aba === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {aba === 'regras' && (
        <AbaRegras campanha={campanha} unidade={unidade} semCalendario={semCalendario} nomeMes={nomeMes} ano={ano}
          regras={regras} onSalvar={salvarRegras} origemRegras={origemRegras}
          nomeEmpresa={unidade === 'TRUCKS' ? 'CAIOBÁ TRUCKS' : (nomeEmpresa[u.empresaId] || u.nome)} />
      )}
      {aba === 'apuracao' && (
        <AbaApuracao campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade}
          blocosMatriz={blocosMatriz}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} />
      )}
      {aba === 'resultado' && <AbaResultado />}
    </div>
  )
}

// ======================================================================================
// Apuração — só o Bloco 3 (Individual) por enquanto (Blocos 1 e 2 ainda não têm dados).
// Uma coluna por semana do mês (mesmas semanas da Matriz KPIs) com a contribuição da semana e,
// no fim, o Total = soma das contribuições das semanas.
// ======================================================================================
function AbaApuracao({ campanha, regras, unidade, ehTrucks, diario, consultores, mecanicos, chefes, gerentes, metasUnidade, funcionarios, erroFunc,
  gerentesGerais, metasPorUnidade, blocosMatriz }) {
  const comum = { campanha, regras, unidade, diario, blocosMatriz, carregandoFunc: funcionarios === null }

  return (
    <div className="space-y-5">
      {ehTrucks ? (
        <BlocoGerenteGeral {...comum} gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade} />
      ) : (
      <>
      <BlocoConsultores {...comum} consultores={consultores} metasUnidade={metasUnidade} erroFunc={erroFunc} />
      <BlocoMecanicos {...comum} mecanicos={mecanicos} />
      <BlocoChefe {...comum} chefes={chefes} mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUnidade} />
      <BlocoGerente {...comum} gerentes={gerentes} mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUnidade} />
      </>
      )}
    </div>
  )
}

// ======================================================================================
// Blocos de cargo da Apuração — por pessoa e por semana: atingimento do Bloco 3 (soma peso ×
// atingimento de cada indicador, com a meta do mês proporcional aos dias úteis da semana).
// Contribuição da semana = peso do Bloco 3 × atingimento da semana × peso da semana
// (dias úteis da semana ÷ dias úteis do mês) — por isso a soma das semanas fecha o mês.
// ======================================================================================

const MATRIZ = {
  consultorFat: 'Bloco 3 - Serviços › Consultor de Serviços › Faturamento Total Oficina (Peças + Serviços)',
  consultorMargem: 'Bloco 3 - Serviços › Consultor de Serviços › Margem Bruta Peças Oficina',
  semMatriz: 'Não existe na Matriz KPIs',
  mecanicoProd: 'Bloco 3 - Serviços › Mecânico › Produtividade da Oficina',
  mecanicoServ: 'Bloco 3 - Serviços › Mecânico › Faturamento Total Oficina (Serviços)',
  unidade: (u, indicador) => `Bloco 3 - Serviços › ${u.quadroMatriz} › ${indicador}`,
}

const unidadeDe = (campanha, unidade) => campanha.unidades.find((x) => x.id === unidade)
// Peso da semana na unidade: dias úteis da semana ÷ dias úteis do mês (calendário da empresa).
function fracaoSemana(campanha, unidade, s) {
  const pt = pesoTotal(campanha, unidade)
  return pt ? pesoSemana(s, unidade) / pt : 0
}
const dentro = (r, s) => r.data >= s.inicio && r.data <= s.fim

// Realizado da unidade na semana (usado por Chefe e Gerente): horas dos mecânicos da campanha
// e faturamento/margem dos consultores da campanha, somados de fato_campanha_diario.
function realizadoDaUnidade(diario, u, s, mecanicos, consultores) {
  const nomesMec = new Set(mecanicos.map((m) => m.nomeErp))
  const nomesCons = new Set(consultores.map((c) => c.nomeErp))
  const codigosCons = new Set(consultores.map((c) => c.codigo).filter(Boolean))
  const t = { vend: 0, aplic: 0, disp: 0, serv: 0, pecas: 0, margem: 0 }
  for (const r of diario || []) {
    if (r.empresa !== u.empresaErp || !dentro(r, s)) continue
    if (r.tipo === 'mecanico' && nomesMec.has(r.pessoa_nome)) {
      t.vend += Number(r.horas_vendidas) || 0
      t.aplic += Number(r.horas_aplicadas) || 0
      t.disp += Number(r.horas_disponiveis) || 0
    }
    if (r.tipo === 'consultor' && (nomesCons.has(r.pessoa_nome) || (r.pessoa_codigo && codigosCons.has(r.pessoa_codigo)))) {
      t.serv += Number(r.serv_valor) || 0
      t.pecas += Number(r.pecas_valor) || 0
      t.margem += Number(r.pecas_margem) || 0
    }
  }
  return t
}

const div = (a, b) => (b ? a / b : null)

// Botão ⓘ: abre um quadro curto com a informação (fecha ao clicar fora ou com Esc).
function Info({ titulo, children }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label={`Origem: ${titulo}`}
        className="h-4 w-4 inline-flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {aberto && (
        <span role="dialog" aria-label={titulo}
          className="absolute z-30 right-0 top-5 w-72 max-w-[80vw] rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-xs leading-relaxed text-slate-600 font-normal normal-case tracking-normal text-left whitespace-normal">
          <span className="block text-[12px] font-bold text-slate-800 mb-1">{titulo}</span>
          {children}
        </span>
      )}
    </span>
  )
}

// Atingimento do Bloco 3 = soma peso × atingimento dos indicadores (null se faltar algum).
const atingimentoB3 = (itens) => (itens.some((it) => it.atingimento == null) ? null : itens.reduce((a, it) => a + it.peso * it.atingimento, 0))

// Card de uma função: uma linha por pessoa, uma coluna por semana com a contribuição do Bloco 3
// na semana, e o Total = soma das semanas. linhas: [{ id, nome, alerta?, semanas: [{ fr, itens }] }]
function ResumoSemanal({ titulo, cor, campanha, linhas, carregando, vazio, blocosMatriz, matrizB3 }) {
  const VAZIO = <span className="text-slate-300">—</span>
  const pesoB3 = blocosMatriz.pesos?.individual || 0
  const semanas = campanha.semanas
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums border-l border-slate-200'
  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} /> {titulo}
        </p>
      </div>
      {carregando ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : !linhas.length ? (
        <p className="px-4 pb-4 text-xs text-slate-500">{vazio}</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Larguras fixas: as colunas ficam alinhadas em todas as tabelas de cargo. */}
          <table className="w-full min-w-[56rem] table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[28%]" />
              {semanas.map((s) => <col key={s.id} />)}
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-t border-slate-200">
                <th rowSpan={2} className={`${TH} text-left align-bottom border-b border-slate-200`}>Nome</th>
                <th colSpan={semanas.length} className={`${TH} text-center border-l border-slate-200`}>
                  <span className="inline-flex items-center gap-1">
                    Bloco 3 · Individual ({pctTxt(pesoB3)}) — contribuição por semana
                    <Info titulo="Bloco 3 · Individual">
                      Matriz KPIs › {matrizB3}. Contribuição da semana = peso do Bloco 3 × atingimento da semana × peso da
                      semana (dias úteis da semana ÷ dias úteis do mês). O Total é a soma das semanas.
                    </Info>
                  </span>
                </th>
                <th rowSpan={2} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Total</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {semanas.map((s, i) => (
                  <th key={s.id} className={`${TH} text-right border-l border-slate-200`} title={s.label}>
                    Sem {i + 1}
                    <span className="block text-[9px] font-medium normal-case tracking-normal text-slate-400">{s.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => {
                const cels = p.semanas.map((w) => {
                  const ating = atingimentoB3(w.itens)
                  // Semana sem dia útil não conta (contribuição 0, sem marcar como parcial).
                  if (!w.fr) return { ating, contrib: 0, semDiaUtil: true }
                  return { ating, contrib: ating == null ? null : pesoB3 * ating * w.fr }
                })
                const parcial = cels.some((c) => c.contrib == null)
                const total = cels.reduce((a, c) => a + (c.contrib || 0), 0)
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-800 whitespace-nowrap truncate" title={p.nome}>
                      {p.nome}
                      {p.alerta && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-px rounded border bg-red-50 text-red-700 border-red-200" title={p.alerta}>Mês zerado</span>
                      )}
                    </td>
                    {cels.map((c, i) => {
                      const w = p.semanas[i]
                      const detalhe = w.itens.map((it) => `${it.indicador} ${pctTxt(it.peso)} × ${it.atingimento == null ? '—' : pctTxt(it.atingimento)}`).join('\n')
                      return (
                        <td key={semanas[i].id} className={TD}
                          title={c.semDiaUtil ? 'Semana sem dia útil'
                            : `Atingimento da semana: ${c.ating == null ? '—' : pctTxt(c.ating)}\nPeso da semana: ${pctTxt(w.fr)}\n${detalhe}`}>
                          {c.semDiaUtil || c.contrib == null ? VAZIO : pctTxt(c.contrib)}
                        </td>
                      )
                    })}
                    <td className={`${TD} font-bold ${COR_TOTAL.real}`}
                      title={parcial ? 'Parcial: semanas sem meta ou sem dados ficaram de fora da soma' : 'Soma das contribuições das semanas'}>
                      <span className={corPct(pesoB3 ? total / pesoB3 : 0)}>{pctTxt(total)}{parcial ? '*' : ''}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BlocoConsultores({ campanha, regras, unidade, diario, blocosMatriz, consultores, metasUnidade, carregandoFunc, erroFunc }) {
  const u = unidadeDe(campanha, unidade)
  const { agrupamentoCargo: agrupamento, departamento } = CAMPANHA.funcoes.consultor
  const { pesos } = regras.funcoes.consultor

  // Faturamento / margem / OS por consultor, uma Map por semana.
  const porSemana = useMemo(() => campanha.semanas.map((s) => {
    const m = new Map()
    for (const r of diario || []) {
      if (r.tipo !== 'consultor' || r.empresa !== u.empresaErp || !dentro(r, s)) continue
      let a = m.get(r.pessoa_nome)
      if (!a) { a = { serv: 0, pecas: 0, margem: 0, os: new Set(), codigo: r.pessoa_codigo }; m.set(r.pessoa_nome, a) }
      a.serv += Number(r.serv_valor) || 0
      a.pecas += Number(r.pecas_valor) || 0
      a.margem += Number(r.pecas_margem) || 0
      for (const os of r.os_codigos || []) a.os.add(os)
    }
    return m
  }), [diario, u.empresaErp, campanha.semanas])

  const linhas = consultores.map((c) => {
    const meta = metaDoConsultor(metasUnidade, c)
    return {
      id: c.id,
      nome: c.nome,
      semanas: campanha.semanas.map((s, i) => {
        const fr = fracaoSemana(campanha, unidade, s)
        const pp = porSemana[i]
        const erp = pp.get(c.nomeErp) || (c.codigo && [...pp.values()].find((a) => a.codigo === c.codigo)) || null
        const realTot = (erp?.serv || 0) + (erp?.pecas || 0)
        const ticket = erp && erp.os.size ? realTot / erp.os.size : 0
        const mb = erp && erp.pecas ? erp.margem / erp.pecas : 0
        return {
          fr,
          itens: [
            { indicador: 'Faturamento', peso: pesos.faturamento, atingimento: meta ? div(realTot, meta.fat * fr) : null, matriz: MATRIZ.consultorFat },
            { indicador: 'Ticket médio', peso: pesos.ticket, atingimento: meta?.ticket ? div(ticket, meta.ticket) : null, matriz: MATRIZ.semMatriz },
            { indicador: 'Margem de peças', peso: pesos.margem, atingimento: meta?.mb ? div(mb, meta.mb) : null, matriz: MATRIZ.consultorMargem },
          ],
        }
      }),
    }
  })

  return (
    <>
      {erroFunc && <p className="text-xs text-red-600">Não foi possível carregar os funcionários: {erroFunc}</p>}
      <ResumoSemanal titulo="Consultores de Serviços" cor={CORES_FUNCAO.consultor} campanha={campanha} linhas={linhas}
        blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Consultor de Serviços"
        carregando={carregandoFunc || diario === null}
        vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} com cargo no agrupamento "${agrupamento}" e departamento ${departamento}. Confira o cadastro em Funcionários.`} />
    </>
  )
}

function BlocoMecanicos({ campanha, regras, unidade, diario, blocosMatriz, mecanicos, carregandoFunc }) {
  const u = unidadeDe(campanha, unidade)
  const R = regras.funcoes.mecanico
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const eficMax = R.travas.eficienciaMax

  // Horas por mecânico em cada semana e no mês inteiro (a trava de eficiência usa o mês).
  const { porSemana, noMes } = useMemo(() => {
    const porSemana = campanha.semanas.map(() => new Map())
    const noMes = new Map()
    const somar = (m, r) => {
      let a = m.get(r.pessoa_nome)
      if (!a) { a = { aplic: 0, vend: 0, disp: 0 }; m.set(r.pessoa_nome, a) }
      a.aplic += Number(r.horas_aplicadas) || 0
      a.vend += Number(r.horas_vendidas) || 0
      a.disp += Number(r.horas_disponiveis) || 0
    }
    for (const r of diario || []) {
      if (r.tipo !== 'mecanico' || r.empresa !== u.empresaErp) continue
      somar(noMes, r)
      campanha.semanas.forEach((s, i) => { if (dentro(r, s)) somar(porSemana[i], r) })
    }
    return { porSemana, noMes }
  }, [diario, u.empresaErp, campanha.semanas])

  const linhas = mecanicos.map((m) => {
    const hMes = noMes.get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
    const eficMes = div(hMes.vend, hMes.aplic)
    const trava = eficMax > 0 && eficMes != null && eficMes >= eficMax
    return {
      id: m.id,
      nome: m.nome,
      alerta: trava ? `Eficiência do mês ${pctTxt(eficMes)} — a partir de ${pctTxt(eficMax)} zera o bônus do mês` : null,
      semanas: campanha.semanas.map((s, i) => {
        const h = porSemana[i].get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
        const prod = div(h.vend, h.disp)
        return {
          fr: fracaoSemana(campanha, unidade, s),
          itens: [
            { indicador: 'Produtividade', peso: 1, atingimento: metaProd ? (prod ?? 0) / metaProd : null, matriz: MATRIZ.mecanicoProd },
          ],
        }
      }),
    }
  })

  return (
    <ResumoSemanal titulo="Mecânicos" cor={CORES_FUNCAO.mecanico} campanha={campanha} linhas={linhas}
      blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Mecânico"
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum mecânico "1 - Trabalhando" de ${u.nome} nos cargos definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Mecânico.`} />
  )
}

function BlocoChefe({ campanha, regras, unidade, diario, blocosMatriz, chefes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const u = unidadeDe(campanha, unidade)
  const R = regras.funcoes.chefe
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const reais = useMemo(() => campanha.semanas.map((s) => realizadoDaUnidade(diario, u, s, mecanicos, consultores)),
    [diario, u, campanha.semanas, mecanicos, consultores])

  if (R.participa?.[unidade] === false) {
    return <ResumoSemanal titulo="Chefe de Oficina" cor={CORES_FUNCAO.chefe} campanha={campanha} linhas={[]} blocosMatriz={blocosMatriz} matrizB3=""
      vazio="Esta unidade não tem Chefe de Oficina (ajuste na aba Regras, cartão do Chefe)." />
  }
  const semanas = campanha.semanas.map((s, i) => {
    const fr = fracaoSemana(campanha, unidade, s)
    const real = reais[i]
    const prod = div(R.baseProdutividade === 'aplicadas' ? real.aplic : real.vend, real.disp)
    const metaServ = (metasUnidade.unidade.oficina.serv || 0) * fr
    return {
      fr,
      itens: [
        { indicador: 'Produtividade geral', peso: R.pesos.produtividade, atingimento: metaProd ? (prod ?? 0) / metaProd : null, matriz: MATRIZ.unidade(u, 'Produtividade da Oficina') },
        { indicador: 'Faturamento de serviços', peso: R.pesos.servicos, atingimento: div(real.serv, metaServ), matriz: MATRIZ.mecanicoServ },
      ],
    }
  })
  const linhas = chefes.map((c) => ({ id: c.id, nome: c.nome, semanas }))
  return (
    <ResumoSemanal titulo="Chefe de Oficina" cor={CORES_FUNCAO.chefe} campanha={campanha} linhas={linhas}
      blocosMatriz={blocosMatriz} matrizB3={`Bloco 3 - Serviços › ${u.quadroMatriz}`}
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} nos cargos de Chefe definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Chefe.`} />
  )
}

function BlocoGerente({ campanha, regras, unidade, diario, blocosMatriz, gerentes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const u = unidadeDe(campanha, unidade)
  const R = regras.funcoes.gerente
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const metaMargem = R.metaMargem?.[unidade] || 0
  const reais = useMemo(() => campanha.semanas.map((s) => realizadoDaUnidade(diario, u, s, mecanicos, consultores)),
    [diario, u, campanha.semanas, mecanicos, consultores])

  const semanas = campanha.semanas.map((s, i) => {
    const fr = fracaoSemana(campanha, unidade, s)
    const real = reais[i]
    const prod = div(regras.funcoes.chefe.baseProdutividade === 'aplicadas' ? real.aplic : real.vend, real.disp)
    const mb = div(real.margem, real.pecas)
    const metaTot = ((metasUnidade.unidade.oficina.pecas || 0) + (metasUnidade.unidade.oficina.serv || 0)) * fr
    return {
      fr,
      itens: [
        { indicador: 'Faturamento', peso: R.pesos.faturamento, atingimento: div(real.serv + real.pecas, metaTot), matriz: MATRIZ.unidade(u, 'Faturamento Total Oficina (Peças + Serviços)') },
        { indicador: 'Produtividade geral', peso: R.pesos.produtividade, atingimento: metaProd ? (prod ?? 0) / metaProd : null, matriz: MATRIZ.unidade(u, 'Produtividade da Oficina') },
        { indicador: 'Margem de peças', peso: R.pesos.margem, atingimento: metaMargem ? (mb ?? 0) / metaMargem : null, matriz: MATRIZ.unidade(u, 'Margem Bruta Peças Oficina') },
      ],
    }
  })
  const linhas = gerentes.map((g) => ({ id: g.id, nome: g.nome, semanas }))
  return (
    <ResumoSemanal titulo={unidade === 'CG' ? 'Gerente de Serviços' : 'Gerente de Filial'} cor={CORES_FUNCAO.gerente} campanha={campanha} linhas={linhas}
      blocosMatriz={blocosMatriz} matrizB3={`Bloco 3 - Serviços › ${u.quadroMatriz}`}
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} nos cargos de Gerente definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Gerente.`} />
  )
}

// Gerente Geral de Pós-Vendas (botão CAIOBÁ TRUCKS): avaliado em cada unidade separadamente.
// Bloco 3 = faturamento total da unidade (peças + serviços de todos os consultores da unidade no
// ERP) ÷ meta da unidade aprovada no Planejamento de Metas (total dos mecânicos, com Funilaria),
// proporcional aos dias úteis da semana naquela unidade.
function BlocoGerenteGeral({ campanha, regras, diario, blocosMatriz, gerentesGerais, metasPorUnidade, carregandoFunc }) {
  // Faturamento por semana × empresa ERP.
  const realPorSemana = useMemo(() => campanha.semanas.map((s) => {
    const m = {}
    for (const r of diario || []) {
      if (r.tipo !== 'consultor' || !dentro(r, s)) continue
      m[r.empresa] = (m[r.empresa] || 0) + (Number(r.serv_valor) || 0) + (Number(r.pecas_valor) || 0)
    }
    return m
  }), [diario, campanha.semanas])
  const linhas = gerentesGerais.flatMap((g) => campanha.unidades.map((x) => {
    const meta = metasPorUnidade?.[x.id]?.unidade?.gg?.fat || 0
    return {
      id: `${g.id}-${x.id}`,
      nome: `${g.nome} · ${x.nome}`,
      semanas: campanha.semanas.map((s, i) => {
        const fr = fracaoSemana(campanha, x.id, s)
        return {
          fr,
          itens: [{ indicador: 'Faturamento total da unidade', peso: 1, atingimento: div(realPorSemana[i][x.empresaErp] || 0, meta * fr), matriz: '' }],
        }
      }),
    }
  }))
  return (
    <ResumoSemanal titulo="Gerente Geral de Pós-Vendas" cor="#475569" campanha={campanha} linhas={linhas}
      blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Gerente Geral Pós-Vendas"
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum funcionário "1 - Trabalhando" das empresas Trucks no agrupamento "${regras.funcoes.gerenteGeral.agrupamento}" com cargo de Gerente Geral de Pós-Vendas. Confira o cadastro em Funcionários.`} />
  )
}

// ======================================================================================
// Resultado — a definir
// ======================================================================================
function AbaResultado() {
  return (
    <div className={`${CARD} p-10 flex flex-col items-center justify-center gap-2 text-center`}>
      <BarChart2 className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">Resultado</p>
      <p className="text-xs text-slate-500">Esta aba ainda será montada.</p>
    </div>
  )
}

// ======================================================================================
// Regras — em reconstrução
// ======================================================================================
const diasFmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Valor em dinheiro: mostra R$ 1.500,00; ao clicar, edita como 1500,00 (vírgula ou ponto aceitos).
const moedaTxt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const lerMoeda = (txt) => {
  const limpo = String(txt).replace(/[^\d,.-]/g, '')
  const n = limpo.includes(',') ? parseFloat(limpo.replace(/\./g, '').replace(',', '.')) : parseFloat(limpo)
  return isNaN(n) ? 0 : n
}
function MoedaInput({ value, onChange, disabled = false, vazio = false, rotulo }) {
  const [texto, setTexto] = useState(null) // null = fora de edição (mostra formatado)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-slate-400 text-xs">R$</span>
      <input type="text" inputMode="decimal" disabled={disabled} aria-label={rotulo}
        className="w-28 text-xs text-right tabular-nums p-1.5 border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
        value={vazio ? '' : (texto ?? moedaTxt(value))}
        onFocus={(e) => { setTexto(moedaTxt(value)); e.target.select() }}
        onChange={(e) => { setTexto(e.target.value); onChange(lerMoeda(e.target.value)) }}
        onBlur={() => setTexto(null)} />
    </span>
  )
}

// Botão de cadeado ao lado de um campo: travado = campo sem valor e não editável.
function Cadeado({ travado, onClick, rotulo, dica, desabilitado = false }) {
  return (
    <button type="button" onClick={onClick} disabled={desabilitado} title={dica}
      aria-label={`${travado ? 'Destravar' : 'Travar'} ${rotulo}`} aria-pressed={travado}
      className={`h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        travado ? 'bg-slate-700 border-slate-700 text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}>
      {travado ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
    </button>
  )
}

// Percentual: mostra 50,00 %; edita em número (50 ou 50,5) e guarda em fração (0.5).
function PctInput({ value, onChange, rotulo }) {
  const [texto, setTexto] = useState(null)
  const fmt = (v) => ((Number(v) || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className="inline-flex items-center gap-1">
      <input type="text" inputMode="decimal" aria-label={rotulo}
        className="w-24 text-xs text-right tabular-nums p-1.5 border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        value={texto ?? fmt(value)}
        onFocus={(e) => { setTexto(fmt(value)); e.target.select() }}
        onChange={(e) => { setTexto(e.target.value); onChange(lerMoeda(e.target.value) / 100) }}
        onBlur={() => setTexto(null)} />
      <span className="text-slate-400 text-xs">%</span>
    </span>
  )
}

// Cópia imutável de obj com o valor trocado no caminho (ex.: ['funcoes', 'consultor', 'alvo', 'CG']).
function comValor(obj, caminho, valor) {
  if (!caminho.length) return valor
  const [k, ...resto] = caminho
  const copia = Array.isArray(obj) ? [...obj] : { ...(obj || {}) }
  copia[k] = comValor(copia[k], resto, valor)
  return copia
}

// Linhas do quadro Bônus-alvo da empresa selecionada: onde fica a Meta e a Supermeta de cada função.
// Funções com bônus-alvo (alvo[unidade]) guardam a Supermeta em supermeta[unidade] (sem valor salvo,
// vale 120% da Meta, como no regulamento). Chefe e Gerente Geral usam o valor fixo das faixas 100 e 120.
function linhasBonus(regras, unidade, unidades) {
  const F = regras.funcoes
  if (unidade === 'TRUCKS') {
    return unidades.map((u) => ({
      k: `gg-${u.id}`, nome: `Gerente Geral · ${u.nome}`,
      meta: ['funcoes', 'gerenteGeral', 'valores', u.id, 'f100'],
      supermeta: ['funcoes', 'gerenteGeral', 'valores', u.id, 'f110'],
    }))
  }
  const porAlvo = (k, nome, semSupermeta = false) => ((F[k]?.alvo?.[unidade] || 0) > 0
    ? [{ k, nome, meta: ['funcoes', k, 'alvo', unidade], supermeta: ['funcoes', k, 'supermeta', unidade], padraoSuper: !semSupermeta }]
    : [])
  return [
    ...porAlvo('consultor', 'Consultor Técnico'),
    ...porAlvo('mecanico', 'Mecânico'),
    ...porAlvo('box', 'Mecânico Box Express', true),
    ...(F.chefe?.participa?.[unidade] !== false
      ? [{ k: 'chefe', nome: 'Chefe de Oficina', meta: ['funcoes', 'chefe', 'valores', 'f100'], supermeta: ['funcoes', 'chefe', 'valores', 'f110'] }]
      : []),
    ...porAlvo('prog', 'Programação / Apontamento'),
    ...porAlvo('gerente', unidade === 'CG' ? 'Gerente de Serviços' : 'Gerente de Filial'),
  ]
}
const lerCaminho = (obj, caminho) => caminho.reduce((o, k) => (o == null ? undefined : o[k]), obj)

// De onde vieram as regras mostradas na aba (gravação da empresa, regra geral ou padrão).
function textoOrigem(origem, nomeMes, ano) {
  if (!origem) return 'padrão do regulamento (nada salvo ainda).'
  const mesOrigem = MESES[Number(origem.mes) - 1]?.label
  if (origem.unidade === 'GERAL') return `regra geral de ${mesOrigem}/${origem.ano} (esta empresa ainda não salvou regras próprias).`
  if (Number(origem.ano) === Number(ano) && mesOrigem === nomeMes) {
    return `gravadas para este mês${origem.atualizado_por ? ` por ${origem.atualizado_por}` : ''}.`
  }
  return `herdadas de ${mesOrigem}/${origem.ano} (último mês salvo desta empresa).`
}

// Semanas do mês escolhido e dias úteis de cada uma (Calendário de cada empresa: sábado = 0,5,
// feriado = 0) + Bônus-alvo editável (Meta e Supermeta) da empresa selecionada.
function AbaRegras({ campanha, unidade, semCalendario, nomeMes, ano, regras, onSalvar, origemRegras, nomeEmpresa }) {
  const unidades = unidade === 'TRUCKS' ? campanha.unidades : campanha.unidades.filter((u) => u.id === unidade)
  const semCal = unidades.filter((u) => semCalendario.includes(u.id))

  // Rascunho do Bônus-alvo: acompanha as regras carregadas do mês; salvar grava para o mês escolhido.
  const [rascunho, setRascunho] = useState(regras)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => { setRascunho(regras); setMsg(null) }, [regras])
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(regras)
  const linhas = linhasBonus(rascunho, unidade, campanha.unidades)
  const valorSuper = (l) => {
    const v = lerCaminho(rascunho, l.supermeta)
    return v == null && l.padraoSuper ? (Number(lerCaminho(rascunho, l.meta)) || 0) * 1.2 : v
  }
  const alterar = (caminho, v) => { setRascunho((r) => comValor(r, caminho, v)); setMsg(null) }
  const salvar = async () => {
    setSalvando(true)
    try {
      await onSalvar(rascunho)
      setMsg({ erro: false, txt: `Salvo para ${nomeEmpresa} — ${nomeMes}/${ano}.` })
    } catch (err) {
      setMsg({ erro: true, txt: `Não foi possível salvar: ${err.message || err}` })
    } finally {
      setSalvando(false)
    }
  }

  // Salvar/Descartar (topo da aba) gravam todas as regras da aba de uma vez: Bônus-alvo e Faixas.
  const botoesSalvar = (
    <div className="flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.erro ? 'text-red-600' : 'text-emerald-700'}`}>{msg.txt}</span>}
      {alterado && (
        <button onClick={() => { setRascunho(regras); setMsg(null) }}
          className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">
          Descartar
        </button>
      )}
      <button onClick={salvar} disabled={salvando || !alterado}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
        {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
      </button>
    </div>
  )

  // Faixas de pagamento DA ABA (empresa ou CAIOBÁ TRUCKS), gravadas em faixasUnidade[aba]; sem faixas
  // próprias, a aba mostra as gerais e a 1ª edição cria a cópia dela. "De" e "Percentual" editáveis;
  // Faixa = atingimento >= "De" e < início da faixa seguinte (a última não tem limite).
  // Ordem fixa (1ª, 2ª, 3ª, 4ª faixa) — sem reordenar pelo valor, senão a linha "pula" enquanto se digita.
  const faixas = faixasDe(rascunho, unidade) || []
  const setFaixa = (id, campo, v) => alterar(['faixasUnidade', unidade],
    faixasDe(rascunho, unidade).map((x) => (x.id === id ? { ...x, [campo]: v } : x)))
  // Quantidade de faixas livre por mês/aba: "+" acrescenta no fim; lixeira remove (fica ao menos uma).
  const adicionarFaixa = () => {
    const atuais = faixasDe(rascunho, unidade) || []
    const ultima = atuais[atuais.length - 1]
    const nova = { id: `f${Date.now().toString(36)}`, min: ultima ? Math.round((ultima.min + 0.1) * 10000) / 10000 : 0.8, paga: 1, base: 'meta' }
    alterar(['faixasUnidade', unidade], [...atuais, nova])
  }
  const removerFaixa = (id) => alterar(['faixasUnidade', unidade], (faixasDe(rascunho, unidade) || []).filter((x) => x.id !== id))

  return (
    <div className="space-y-5">
      {/* Um só Salvar para a aba inteira: grava as regras DESTA empresa para o mês/ano escolhido. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-600">
          <b className="text-slate-800">Regras de {nomeEmpresa} · {nomeMes}/{ano}:</b>{' '}
          {textoOrigem(origemRegras, nomeMes, ano)}
        </p>
        {botoesSalvar}
      </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
      <section className={`${CARD} p-4 space-y-3`}>
        <h2 className="text-sm font-bold text-slate-900">Semanas de {nomeMes}/{ano}</h2>
        {semCal.length > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Calendário de {ano} não gerado para {semCal.map((u) => u.nome).join(', ')} — usando seg–sex = 1 e sábado = 0,5 até ser gerado.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className={`${TH} text-left`}>Semana</th>
                <th className={`${TH} text-left`}>Período</th>
                {unidades.map((u) => (
                  <th key={u.id} className={`${TH} text-right`}>{unidades.length > 1 ? u.nome : 'Dias úteis'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campanha.semanas.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="p-2 font-semibold text-slate-700 whitespace-nowrap">Sem {s.id.slice(1)}</td>
                  <td className="p-2 text-slate-600 whitespace-nowrap">{s.label}</td>
                  {unidades.map((u) => (
                    <td key={u.id} className="p-2 text-right tabular-nums">{diasFmt(pesoSemana(s, u.id))}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="p-2 text-slate-900" colSpan={2}>Total do mês</td>
                {unidades.map((u) => (
                  <td key={u.id} className="p-2 text-right tabular-nums">{diasFmt(pesoTotal(campanha, u.id))}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-900">Bônus-alvo</h2>
        </div>
        {linhas.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma função com bônus nesta empresa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className={`${TH} text-left`}>Função</th>
                  <th className={`${TH} text-right`}>Meta</th>
                  <th className={`${TH} text-right`}>Supermeta</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  // Travas em bonusBloqueado[unidade]: '<linha>:meta' e '<linha>:super' (o antigo
                  // '<linha>' = true trava as duas). Meta travada trava também a Supermeta. Campo travado
                  // fica vazio (sem valor); o valor digitado antes fica guardado e volta ao destravar.
                  const travas = rascunho.bonusBloqueado?.[unidade] || {}
                  const metaTravada = !!travas[`${l.k}:meta`] || travas[l.k] === true
                  const superTravada = metaTravada || !!travas[`${l.k}:super`]
                  const travar = (campo, valor) => {
                    let t = { ...travas }
                    delete t[l.k] // formato antigo
                    if (campo === 'meta') t = { ...t, [`${l.k}:meta`]: valor, [`${l.k}:super`]: valor }
                    else t = { ...t, [`${l.k}:super`]: valor }
                    alterar(['bonusBloqueado', unidade], t)
                  }
                  return (
                    <tr key={l.k} className={`border-b border-slate-100 last:border-0 ${metaTravada ? 'bg-slate-50' : ''}`}>
                      <td className={`p-2 font-medium whitespace-nowrap ${metaTravada ? 'text-slate-400' : 'text-slate-700'}`}>{l.nome}</td>
                      <td className="p-1.5 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <Cadeado travado={metaTravada} rotulo={`Meta — ${l.nome}`} onClick={() => travar('meta', !metaTravada)}
                            dica={metaTravada ? 'Destravar a Meta (a Supermeta também é destravada)' : 'Travar a Meta sem valor (a Supermeta também é travada)'} />
                          <MoedaInput rotulo={`Meta — ${l.nome}`} vazio={metaTravada} disabled={metaTravada}
                            value={lerCaminho(rascunho, l.meta) ?? 0} onChange={(v) => alterar(l.meta, v)} />
                        </span>
                      </td>
                      <td className="p-1.5 text-right">
                        {l.supermeta && (
                          <span className="inline-flex items-center gap-1.5">
                            <Cadeado travado={superTravada} rotulo={`Supermeta — ${l.nome}`} desabilitado={metaTravada}
                              onClick={() => travar('super', !superTravada)}
                              dica={metaTravada ? 'Travada junto com a Meta' : superTravada ? 'Destravar a Supermeta' : 'Travar a Supermeta sem valor'} />
                            <MoedaInput rotulo={`Supermeta — ${l.nome}`} vazio={superTravada} disabled={superTravada}
                              value={valorSuper(l) ?? 0} onChange={(v) => alterar(l.supermeta, v)} />
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>

      <section className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-900">Faixas de pagamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className={`${TH} text-left`}>Atingimento ≥</th>
                <th className={`${TH} text-left`}>e menor que</th>
                <th className={`${TH} text-left`}>Percentual aplicado sobre o bônus</th>
                <th className={`${TH} text-left`}>Aplicar sobre</th>
                <th className={`${TH} w-10`} aria-label="Remover" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 text-slate-500">
                <td className="p-2">—</td>
                <td className="p-2 tabular-nums">&lt; {faixas.length ? pctTxt(faixas[0].min) : '—'}</td>
                <td className="p-2 tabular-nums">0,00%</td>
                <td className="p-2" />
                <td className="p-2" />
              </tr>
              {faixas.map((f, i) => {
                const prox = faixas[i + 1]
                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-1.5"><PctInput rotulo="Atingimento maior ou igual a" value={f.min} onChange={(v) => setFaixa(f.id, 'min', v)} /></td>
                    <td className="p-2 tabular-nums text-slate-600 whitespace-nowrap">{prox ? <>&lt; {pctTxt(prox.min)}</> : 'sem limite'}</td>
                    <td className="p-1.5"><PctInput rotulo="Percentual aplicado sobre o bônus" value={f.paga} onChange={(v) => setFaixa(f.id, 'paga', v)} /></td>
                    <td className="p-1.5">
                      <select aria-label="Aplicar o percentual sobre" value={f.base || 'meta'} onChange={(e) => setFaixa(f.id, 'base', e.target.value)}
                        className="text-xs p-1.5 border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <option value="meta">Meta</option>
                        <option value="supermeta">Supermeta</option>
                      </select>
                    </td>
                    <td className="p-1.5 text-center">
                      <button type="button" onClick={() => removerFaixa(f.id)} disabled={faixas.length <= 1}
                        title="Remover esta faixa" aria-label={`Remover faixa a partir de ${pctTxt(f.min)}`}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={adicionarFaixa}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100">
          <Plus className="h-3.5 w-3.5" /> Adicionar faixa
        </button>
      </section>
    </div>
  )
}
