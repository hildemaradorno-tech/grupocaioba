import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Calculator, BookOpen, BarChart2, Loader2, RefreshCw, Info as InfoIcon } from 'lucide-react'
import { apiService } from '../../services/api'
import { sincronizarCampanha } from '../../services/kpiService'
import {
  CAMPANHA, REGRAS_PADRAO, combinarMetasUnidade, trimestreDoMes, atingimentoBlocoMatriz, montarSemanas, pesoSemana, pesoTotal, pctTxt,
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

  // Regras vigentes no mês (fato_campanha_regras): as do mês, senão as do último mês salvo,
  // senão o padrão do regulamento.
  const [regras, setRegras] = useState(REGRAS_PADRAO)
  useEffect(() => {
    let vivo = true
    apiService.getCampanhaRegras(Number(ano), Number(mes))
      .then((linha) => { if (vivo) setRegras(mesclarRegras(REGRAS_PADRAO, linha?.dados)) })
      .catch(() => { if (vivo) setRegras(REGRAS_PADRAO) })
    return () => { vivo = false }
  }, [ano, mes])
  const nomeMesDe = (m) => MESES.find((x) => Number(x.v) === Number(m))?.label

  const { semanas } = useMemo(
    () => montarSemanas(Number(ano), Number(mes), calendarios, CAMPANHA, regras.semanaMinSegSex),
    [ano, mes, calendarios, regras.semanaMinSegSex],
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

  // Programa trimestral: realizado e metas aprovadas do 1º mês do trimestre até o mês escolhido
  // (acumulado), para a visão "Trimestre" da Apuração.
  const tri = regras.modelo === 'trimestral' && regras.trimestre && Number(ano) === Number(regras.trimestre.ano)
    && regras.trimestre.meses.includes(Number(mes)) ? regras.trimestre : null
  const mesesTri = tri ? tri.meses.filter((m) => m <= Number(mes)) : []
  const chaveTri = mesesTri.join(',')
  const [dadosTri, setDadosTri] = useState(null)
  useEffect(() => {
    if (!chaveTri) { setDadosTri(null); return undefined }
    let vivo = true
    setDadosTri(null)
    const meses = chaveTri.split(',').map(Number)
    Promise.all(meses.map((m) => Promise.all([apiService.getCampanhaDiario(Number(ano), m), apiService.getCampanhaMetasAprovadas(Number(ano), m)])))
      .then((res) => { if (vivo) setDadosTri({ diario: res.flatMap((r) => r[0]), metas: res.map((r) => r[1]) }) })
      .catch(() => { if (vivo) setDadosTri({ diario: [], metas: [] }) })
    return () => { vivo = false }
  }, [ano, chaveTri, recarregar])
  const metasTri = useMemo(
    () => (dadosTri ? combinarMetasUnidade(dadosTri.metas.map((a) => metasAprovadasDaUnidade(a, u.empresaId))) : null),
    [dadosTri, u.empresaId],
  )
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

  const rotuloTri = mesesTri.length ? `Trimestre acumulado · ${nomeMesDe(mesesTri[0])} a ${nomeMesDe(mesesTri[mesesTri.length - 1])}` : null
  const mecanicos = useMemo(() => mecanicosDaUnidade(funcionarios, u, regras), [funcionarios, u, regras])
  const chefes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'chefe'), [funcionarios, u, regras])
  const gerentes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'gerente'), [funcionarios, u, regras])

  // CAIOBÁ TRUCKS: Gerente Geral de Pós-Vendas, avaliado em cada unidade separadamente.
  const gerentesGerais = useMemo(() => gerentesGeraisTrucks(funcionarios, regras), [funcionarios, regras])
  const metasPorUnidade = useMemo(
    () => Object.fromEntries(CAMPANHA.unidades.map((x) => [x.id, metasAprovadasDaUnidade(metasAprovadas, x.empresaId)])),
    [metasAprovadas],
  )
  const metasTriPorUnidade = useMemo(
    () => (dadosTri ? Object.fromEntries(CAMPANHA.unidades.map((x) => [x.id, combinarMetasUnidade(dadosTri.metas.map((a) => metasAprovadasDaUnidade(a, x.empresaId)))])) : null),
    [dadosTri],
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

      {aba === 'regras' && <AbaRegras />}
      {aba === 'apuracao' && (
        <AbaApuracao campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade} metasTriPorUnidade={metasTriPorUnidade}
          rotuloTri={rotuloTri} diarioTri={dadosTri?.diario ?? null} metasTri={metasTri}
          blocosMatriz={blocosMatriz} nomeMes={nomeMes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} />
      )}
      {aba === 'resultado' && <AbaResultado />}
    </div>
  )
}

// ======================================================================================
// Apuração — um bloco por função; unidade e período (semana ou mês) valem para todos
// ======================================================================================
function AbaApuracao({ campanha, regras, unidade, ehTrucks, diario, consultores, mecanicos, chefes, gerentes, metasUnidade, funcionarios, erroFunc,
  gerentesGerais, metasPorUnidade, metasTriPorUnidade, rotuloTri, diarioTri, metasTri, blocosMatriz }) {
  // Período avaliado: o mês escolhido no topo; no programa trimestral, o trimestre acumulado até ele.
  const periodo = rotuloTri ? 'TRI' : 'MES'
  const noTri = periodo === 'TRI'
  const diarioUsado = noTri ? diarioTri : diario
  const metasUsadas = noTri ? (metasTri || metasUnidade) : metasUnidade
  const comum = { campanha, regras, unidade, periodo, diario: diarioUsado, blocosMatriz }

  return (
    <div className="space-y-5">
      {ehTrucks ? (
        <BlocoGerenteGeral {...comum} gerentesGerais={gerentesGerais}
          metasPorUnidade={noTri ? (metasTriPorUnidade || metasPorUnidade) : metasPorUnidade} carregandoFunc={funcionarios === null} />
      ) : (
      <>
      <BlocoConsultores {...comum}
        consultores={consultores} metasUnidade={metasUsadas} carregandoFunc={funcionarios === null} erroFunc={erroFunc} />

      <BlocoMecanicos {...comum}
        mecanicos={mecanicos} carregandoFunc={funcionarios === null} />

      <BlocoChefe {...comum} chefes={chefes}
        mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUsadas} carregandoFunc={funcionarios === null} />

      <BlocoGerente {...comum} gerentes={gerentes}
        mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUsadas} carregandoFunc={funcionarios === null} />
      </>
      )}
    </div>
  )
}

// ======================================================================================
// Blocos de cargo da Apuração — resumo por pessoa: indicador, contribuição e bloco da Matriz KPIs
// Contribuição = peso do indicador × atingimento do indicador (realizado ÷ meta), como na coluna
// de contribuição da Matriz KPIs. A soma das contribuições é o atingimento que define a faixa.
// ======================================================================================

const MATRIZ = {
  consultorFat: 'Bloco 3 - Serviços › Consultor de Serviços › Faturamento Total Oficina (Peças + Serviços)',
  consultorMargem: 'Bloco 3 - Serviços › Consultor de Serviços › Margem Bruta Peças Oficina',
  semMatriz: 'Não existe na Matriz KPIs',
  mecanicoProd: 'Bloco 3 - Serviços › Mecânico › Produtividade da Oficina',
  mecanicoServ: 'Bloco 3 - Serviços › Mecânico › Faturamento Total Oficina (Serviços)',
  unidade: (u, indicador) => `Bloco 3 - Serviços › ${u.quadroMatriz} › ${indicador}`,
}

// Contexto do período escolhido (semana ou mês) para uma unidade.
function periodoDaUnidade(campanha, unidade, periodo) {
  const u = campanha.unidades.find((x) => x.id === unidade)
  const pt = pesoTotal(campanha, unidade)
  const mensal = periodo === 'MES' || periodo === 'TRI'
  const sem = campanha.semanas.find((s) => s.id === periodo)
  const fr = mensal ? 1 : (pt ? pesoSemana(sem, unidade) / pt : 0)
  return { u, mensal, sem, fr }
}

// Realizado da unidade no período (usado por Chefe e Gerente): horas dos mecânicos da campanha
// e faturamento/margem dos consultores da campanha, somados de fato_campanha_diario.
function realizadoDaUnidade(diario, u, mensal, sem, mecanicos, consultores) {
  const nomesMec = new Set(mecanicos.map((m) => m.nomeErp))
  const nomesCons = new Set(consultores.map((c) => c.nomeErp))
  const codigosCons = new Set(consultores.map((c) => c.codigo).filter(Boolean))
  const t = { vend: 0, aplic: 0, disp: 0, serv: 0, pecas: 0, margem: 0 }
  for (const r of diario || []) {
    if (r.empresa !== u.empresaErp) continue
    if (!mensal && (r.data < sem.inicio || r.data > sem.fim)) continue
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

// Card de uma função: uma linha por pessoa e os blocos da Matriz KPIs em colunas. Cada célula
// mostra a contribuição do bloco (peso do bloco × atingimento do bloco); o Bloco 3 é o
// atingimento da função (soma peso × atingimento de cada indicador — detalhe no tooltip).
function ResumoContribuicao({ titulo, cor, pessoas, carregando, vazio, blocosMatriz, matrizB3 }) {
  const VAZIO = <span className="text-slate-300">—</span>
  const P = blocosMatriz.pesos || {}
  const q = blocosMatriz.q.toUpperCase()
  const cols = [
    { k: 'companhia', titulo: 'Bloco 1 · Companhia', origem: `Matriz KPIs › Bloco 1 - Corporativo (${q})` },
    { k: 'departamento', titulo: 'Bloco 2 · Departamento', origem: `Matriz KPIs › Bloco 2 - Departamental › Pós-Vendas (${q})` },
    { k: 'individual', titulo: 'Bloco 3 · Individual', origem: `Matriz KPIs › ${matrizB3}` },
  ]
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums'
  const G = 'border-l border-slate-200'
  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} /> {titulo}
        </p>
      </div>
      {carregando ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : !pessoas.length ? (
        <p className="px-4 pb-4 text-xs text-slate-500">{vazio}</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Larguras fixas: as colunas dos blocos ficam alinhadas em todas as tabelas de cargo. */}
          <table className="w-full min-w-[56rem] table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[32%]" />
              {cols.map((c) => <col key={c.k} className="w-[19.5%]" />)}
              <col className="w-[9.5%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className={`${TH} text-left align-bottom`}>Nome</th>
                {cols.map((c) => (
                  <th key={c.k} className={`${TH} text-right align-bottom ${G}`}>
                    <span className="inline-flex items-center gap-1">
                      {c.titulo} ({pctTxt(P[c.k] || 0)})
                      <Info titulo={c.titulo}>{c.origem}</Info>
                    </span>
                  </th>
                ))}
                <th className={`${TH} text-right align-bottom ${G}`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => {
                const contribs = p.itens.map((it) => (it.atingimento == null ? null : it.peso * it.atingimento))
                const individual = contribs.some((c) => c == null) ? null : contribs.reduce((a, c) => a + c, 0)
                const ating = { companhia: blocosMatriz.companhia, departamento: blocosMatriz.departamento, individual }
                const contrib = Object.fromEntries(cols.map((c) => [c.k, ating[c.k] == null ? null : (P[c.k] || 0) * ating[c.k]]))
                const disponiveis = cols.filter((c) => contrib[c.k] != null)
                const total = disponiveis.length ? disponiveis.reduce((a, c) => a + contrib[c.k], 0) : null
                const detalheB3 = p.itens.map((it, i) => `${it.indicador} ${pctTxt(it.peso)} × ${it.atingimento == null ? '—' : pctTxt(it.atingimento)} = ${contribs[i] == null ? '—' : pctTxt(contribs[i])}`).join('\n')
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-800 whitespace-nowrap truncate" title={p.nome}>
                      {p.nome}
                      {p.alerta && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-px rounded border bg-red-50 text-red-700 border-red-200" title={p.alerta}>Mês zerado</span>
                      )}
                    </td>
                    {cols.map((c) => (
                      <td key={c.k} className={`${TD} ${G}`}
                        title={c.k === 'individual'
                          ? `Atingimento da função: ${individual == null ? '—' : pctTxt(individual)}\n${detalheB3}`
                          : ating[c.k] == null ? 'Sem dados deste bloco na Matriz KPIs para o trimestre' : `Atingimento do bloco: ${pctTxt(ating[c.k])}`}>
                        {contrib[c.k] == null ? VAZIO : pctTxt(contrib[c.k])}
                      </td>
                    ))}
                    <td className={`${TD} ${G} font-bold ${COR_TOTAL.real}`}
                      title={disponiveis.length < cols.length ? 'Parcial: só soma os blocos com dados' : undefined}>
                      {total == null ? VAZIO : <span className={corPct(total)}>{pctTxt(total)}{disponiveis.length < cols.length ? '*' : ''}</span>}
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

function BlocoConsultores({ campanha, regras, unidade, periodo, diario, blocosMatriz, consultores, metasUnidade, carregandoFunc, erroFunc }) {
  const { u, mensal, sem, fr } = periodoDaUnidade(campanha, unidade, periodo)
  const { agrupamentoCargo: agrupamento, departamento } = CAMPANHA.funcoes.consultor
  const { pesos } = regras.funcoes.consultor

  const porPessoa = useMemo(() => {
    const m = new Map()
    for (const r of diario || []) {
      if (r.tipo !== 'consultor' || r.empresa !== u.empresaErp) continue
      if (!mensal && (r.data < sem.inicio || r.data > sem.fim)) continue
      let a = m.get(r.pessoa_nome)
      if (!a) { a = { serv: 0, pecas: 0, margem: 0, os: new Set(), codigo: r.pessoa_codigo }; m.set(r.pessoa_nome, a) }
      a.serv += Number(r.serv_valor) || 0
      a.pecas += Number(r.pecas_valor) || 0
      a.margem += Number(r.pecas_margem) || 0
      for (const os of r.os_codigos || []) a.os.add(os)
    }
    return m
  }, [diario, u.empresaErp, mensal, sem])

  const pessoas = consultores.map((c) => {
    const meta = metaDoConsultor(metasUnidade, c)
    const erp = porPessoa.get(c.nomeErp) || (c.codigo && [...porPessoa.values()].find((a) => a.codigo === c.codigo)) || null
    const realTot = (erp?.serv || 0) + (erp?.pecas || 0)
    const ticket = erp && erp.os.size ? realTot / erp.os.size : 0
    const mb = erp && erp.pecas ? erp.margem / erp.pecas : 0
    return {
      id: c.id,
      nome: c.nome,
      itens: [
        { indicador: 'Faturamento', peso: pesos.faturamento, atingimento: meta ? div(realTot, meta.fat * fr) : null, matriz: MATRIZ.consultorFat },
        { indicador: 'Ticket médio', peso: pesos.ticket, atingimento: meta?.ticket ? div(ticket, meta.ticket) : null, matriz: MATRIZ.semMatriz },
        { indicador: 'Margem de peças', peso: pesos.margem, atingimento: meta?.mb ? div(mb, meta.mb) : null, matriz: MATRIZ.consultorMargem },
      ],
    }
  })

  return (
    <>
      {erroFunc && <p className="text-xs text-red-600">Não foi possível carregar os funcionários: {erroFunc}</p>}
      <ResumoContribuicao titulo="Consultores de Serviços" cor={CORES_FUNCAO.consultor} pessoas={pessoas}
        blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Consultor de Serviços"
        carregando={carregandoFunc || diario === null}
        vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} com cargo no agrupamento "${agrupamento}" e departamento ${departamento}. Confira o cadastro em Funcionários.`} />
    </>
  )
}

function BlocoMecanicos({ campanha, regras, unidade, periodo, diario, blocosMatriz, mecanicos, carregandoFunc }) {
  const { u, mensal, sem } = periodoDaUnidade(campanha, unidade, periodo)
  const R = regras.funcoes.mecanico
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const eficMax = R.travas.eficienciaMax

  // Horas por mecânico no período e no mês inteiro (a trava de eficiência usa o mês).
  const { noPeriodo, noMes } = useMemo(() => {
    const noPeriodo = new Map(), noMes = new Map()
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
      if (mensal || (r.data >= sem.inicio && r.data <= sem.fim)) somar(noPeriodo, r)
    }
    return { noPeriodo, noMes }
  }, [diario, u.empresaErp, mensal, sem])

  const pessoas = mecanicos.map((m) => {
    const h = noPeriodo.get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
    const hMes = noMes.get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
    const prod = div(h.vend, h.disp)
    const eficMes = div(hMes.vend, hMes.aplic)
    const trava = eficMax > 0 && eficMes != null && eficMes >= eficMax
    return {
      id: m.id,
      nome: m.nome,
      alerta: trava ? `Eficiência do mês ${pctTxt(eficMes)} — a partir de ${pctTxt(eficMax)} zera o bônus do mês` : null,
      itens: [
        { indicador: 'Produtividade', peso: 1, atingimento: metaProd && prod != null ? prod / metaProd : null, matriz: MATRIZ.mecanicoProd },
      ],
    }
  })

  return (
    <ResumoContribuicao titulo="Mecânicos" cor={CORES_FUNCAO.mecanico} pessoas={pessoas}
      blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Mecânico"
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum mecânico "1 - Trabalhando" de ${u.nome} nos cargos definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Mecânico.`} />
  )
}

function BlocoChefe({ campanha, regras, unidade, periodo, diario, blocosMatriz, chefes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const { u, mensal, sem, fr } = periodoDaUnidade(campanha, unidade, periodo)
  const R = regras.funcoes.chefe
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const real = useMemo(() => realizadoDaUnidade(diario, u, mensal, sem, mecanicos, consultores),
    [diario, u, mensal, sem, mecanicos, consultores])
  const prod = div(R.baseProdutividade === 'aplicadas' ? real.aplic : real.vend, real.disp)
  const metaServ = (metasUnidade.unidade.oficina.serv || 0) * fr

  if (R.participa?.[unidade] === false) {
    return <ResumoContribuicao titulo="Chefe de Oficina" cor={CORES_FUNCAO.chefe} pessoas={[]} blocosMatriz={blocosMatriz} matrizB3=""
      vazio="Esta unidade não tem Chefe de Oficina (ajuste na aba Regras, cartão do Chefe)." />
  }
  const pessoas = chefes.map((c) => ({
    id: c.id,
    nome: c.nome,
    itens: [
      { indicador: 'Produtividade geral', peso: R.pesos.produtividade, atingimento: metaProd && prod != null ? prod / metaProd : null, matriz: MATRIZ.unidade(u, 'Produtividade da Oficina') },
      { indicador: 'Faturamento de serviços', peso: R.pesos.servicos, atingimento: div(real.serv, metaServ), matriz: MATRIZ.mecanicoServ },
    ],
  }))
  return (
    <ResumoContribuicao titulo="Chefe de Oficina" cor={CORES_FUNCAO.chefe} pessoas={pessoas}
      blocosMatriz={blocosMatriz} matrizB3={`Bloco 3 - Serviços › ${u.quadroMatriz}`}
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} nos cargos de Chefe definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Chefe.`} />
  )
}

function BlocoGerente({ campanha, regras, unidade, periodo, diario, blocosMatriz, gerentes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const { u, mensal, sem, fr } = periodoDaUnidade(campanha, unidade, periodo)
  const R = regras.funcoes.gerente
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const metaMargem = R.metaMargem?.[unidade] || 0
  const real = useMemo(() => realizadoDaUnidade(diario, u, mensal, sem, mecanicos, consultores),
    [diario, u, mensal, sem, mecanicos, consultores])
  const prod = div(regras.funcoes.chefe.baseProdutividade === 'aplicadas' ? real.aplic : real.vend, real.disp)
  const mb = div(real.margem, real.pecas)
  const metaTot = ((metasUnidade.unidade.oficina.pecas || 0) + (metasUnidade.unidade.oficina.serv || 0)) * fr

  const pessoas = gerentes.map((g) => ({
    id: g.id,
    nome: g.nome,
    itens: [
      { indicador: 'Faturamento', peso: R.pesos.faturamento, atingimento: div(real.serv + real.pecas, metaTot), matriz: MATRIZ.unidade(u, 'Faturamento Total Oficina (Peças + Serviços)') },
      { indicador: 'Produtividade geral', peso: R.pesos.produtividade, atingimento: metaProd && prod != null ? prod / metaProd : null, matriz: MATRIZ.unidade(u, 'Produtividade da Oficina') },
      { indicador: 'Margem de peças', peso: R.pesos.margem, atingimento: metaMargem && mb != null ? mb / metaMargem : null, matriz: MATRIZ.unidade(u, 'Margem Bruta Peças Oficina') },
    ],
  }))
  return (
    <ResumoContribuicao titulo={unidade === 'CG' ? 'Gerente de Serviços' : 'Gerente de Filial'} cor={CORES_FUNCAO.gerente} pessoas={pessoas}
      blocosMatriz={blocosMatriz} matrizB3={`Bloco 3 - Serviços › ${u.quadroMatriz}`}
      carregando={carregandoFunc || diario === null}
      vazio={`Nenhum funcionário "1 - Trabalhando" de ${u.nome} nos cargos de Gerente definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Gerente.`} />
  )
}

// Gerente Geral de Pós-Vendas (botão CAIOBÁ TRUCKS): avaliado em cada unidade separadamente.
// Bloco 3 = faturamento total da unidade (peças + serviços de todos os consultores da unidade no
// ERP) ÷ meta da unidade aprovada no Planejamento de Metas (total dos mecânicos, com Funilaria).
function BlocoGerenteGeral({ campanha, regras, periodo, diario, blocosMatriz, gerentesGerais, metasPorUnidade, carregandoFunc }) {
  const mensal = periodo === 'MES' || periodo === 'TRI'
  const realPorEmpresa = useMemo(() => {
    const m = {}
    for (const r of diario || []) {
      if (r.tipo !== 'consultor') continue
      m[r.empresa] = (m[r.empresa] || 0) + (Number(r.serv_valor) || 0) + (Number(r.pecas_valor) || 0)
    }
    return m
  }, [diario])
  const pessoas = gerentesGerais.flatMap((g) => campanha.unidades.map((x) => {
    const meta = metasPorUnidade?.[x.id]?.unidade?.gg?.fat || 0
    return {
      id: `${g.id}-${x.id}`,
      nome: `${g.nome} · ${x.nome}`,
      itens: [{ indicador: 'Faturamento total da unidade', peso: 1, atingimento: mensal ? div(realPorEmpresa[x.empresaErp] || 0, meta) : null, matriz: '' }],
    }
  }))
  return (
    <ResumoContribuicao titulo="Gerente Geral de Pós-Vendas" cor="#475569" pessoas={pessoas}
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
function AbaRegras() {
  return (
    <div className={`${CARD} p-10 flex flex-col items-center justify-center gap-2 text-center`}>
      <BookOpen className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">Regras</p>
      <p className="text-xs text-slate-500">Esta aba está sendo reconstruída.</p>
    </div>
  )
}
