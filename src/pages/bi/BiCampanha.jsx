import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Calculator, BookOpen, BarChart2, Loader2, RefreshCw, Info as InfoIcon, Lock, Unlock, Plus, Trash2, Eraser, Copy, Settings } from 'lucide-react'
import { createPortal } from 'react-dom'
import { apiService } from '../../services/api'
import { fetchBloco3Servicos } from '../../services/kpiService'
import { useSincronizacaoKpi } from '../../hooks/useSincronizacaoKpi'
import { useAuth } from '../../context/AuthContext'
import {
  CAMPANHA, REGRAS_PADRAO, faixasDe, trimestreDoMes, atingimentoBlocoMatriz, montarSemanas, pesoSemana, pesoTotal, pctTxt,
  mesclarRegras, metasAprovadasDaUnidade, metaDoConsultor, semanasMatrizDoMes, contribSemanaMatriz,
} from '../../utils/campanhaPosVenda'

// BI da Campanha de Bônus do Pós-Venda.
//   Regras   = em reconstrução (vazia). As regras vigentes continuam vindo de REGRAS_PADRAO e de
//              fato_campanha_regras (gravadas por mês) e são usadas pela Apuração.
//   Apuração = cada pessoa avaliada nos blocos 1, 2 e 3 da Matriz KPIs, no mês escolhido
//              (ou no trimestre acumulado, no programa trimestral)
// Realizado vem de fato_campanha_diario (1 linha por dia × empresa × pessoa), gravada pelo
// sync da Matriz KPIs no backend — a tela nunca lê o SharePoint, só essa tabela pequena.

// Seletores do topo (Ano/Mês) no mesmo modelo da Matriz KPIs.
const SEL_TOPO = 'bg-white text-slate-700 text-sm rounded-md px-2 py-1.5 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer'
const MESES = [
  { v: '01', label: 'Janeiro' }, { v: '02', label: 'Fevereiro' }, { v: '03', label: 'Março' },
  { v: '04', label: 'Abril' }, { v: '05', label: 'Maio' }, { v: '06', label: 'Junho' },
  { v: '07', label: 'Julho' }, { v: '08', label: 'Agosto' }, { v: '09', label: 'Setembro' },
  { v: '10', label: 'Outubro' }, { v: '11', label: 'Novembro' }, { v: '12', label: 'Dezembro' },
]
const TH = 'p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400'
const CARD = 'rounded-lg border border-slate-200 bg-white shadow-sm'


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
  const [slotAcoes, setSlotAcoes] = useState(null) // elemento à direita das abas (Salvar + engrenagem da aba Regras)
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

  // "Atualizar números" = a mesma atualização da Matriz KPIs (Matriz + Campanha, um processo só no
  // backend). Ao terminar — iniciada aqui, na Matriz ou por outra pessoa — relê os dados da tela.
  const sync = useSincronizacaoKpi((status) => { if (status !== 'ERRO') setRecarregar((n) => n + 1) })

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
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-600" /> BI — Campanha Pós-Venda
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Objetivo: calcular, de forma transparente, o bônus da campanha de cada colaborador do Pós-Venda,
            premiando quem atinge as metas da Matriz KPIs semana a semana.
          </p>
          {sync.mensagem && <p role="status" className="text-xs text-slate-600 mt-1">{sync.mensagem}</p>}
          {erroDados && <p className="text-xs text-red-600 mt-1">Não foi possível carregar os dados: {erroDados}</p>}
        </div>
        {/* Mesmo modelo do topo da Matriz KPIs: botão só com o ícone + "Ano:" / "Mês:" ao lado. */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mesma atualização do botão da Matriz KPIs (Matriz + Campanha). Travado em todas as telas
              enquanto qualquer pessoa estiver atualizando. */}
          <button type="button" onClick={() => sync.iniciar(user?.email)} disabled={sync.executando}
            title={sync.executando ? `Atualizando…${sync.porQuem ? ` (iniciada por ${sync.porQuem})` : ''} — aguarde terminar` : 'Atualizar números'}
            aria-label={sync.executando ? 'Atualizando' : 'Atualizar números'}
            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${sync.executando ? 'animate-spin' : ''}`} />
          </button>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Ano:</span>
            <select className={SEL_TOPO} value={ano} onChange={(e) => setAno(e.target.value)}>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Mês:</span>
            <select className={SEL_TOPO} value={mes} onChange={(e) => setMes(e.target.value)}>
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
        {/* Espaço à direita da linha das abas: a aba Regras coloca aqui o Salvar e a engrenagem. */}
        <div ref={setSlotAcoes} className="ml-auto flex items-center gap-2 pb-1.5" />
      </div>

      {aba === 'regras' && (
        <AbaRegras slotAcoes={slotAcoes} campanha={campanha} unidade={unidade} semCalendario={semCalendario} nomeMes={nomeMes} ano={ano} mes={mes}
          regras={regras} onSalvar={salvarRegras} origemRegras={origemRegras}
          nomeEmpresa={unidade === 'TRUCKS' ? 'CAIOBÁ TRUCKS' : (nomeEmpresa[u.empresaId] || u.nome)} />
      )}
      {aba === 'apuracao' && (
        <AbaApuracao campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade}
          blocosMatriz={blocosMatriz} ano={ano} mes={mes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} versaoDados={recarregar} />
      )}
      {aba === 'resultado' && (
        <AbaApuracao modo="resultado" campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade}
          blocosMatriz={blocosMatriz} ano={ano} mes={mes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} versaoDados={recarregar} />
      )}
    </div>
  )
}

// ======================================================================================
// Apuração — só o Bloco 3 (Individual) por enquanto (Blocos 1 e 2 ainda não têm dados).
// Uma coluna por semana do mês (mesmas semanas da Matriz KPIs) com a contribuição da semana e,
// no fim, o Total = soma das contribuições das semanas.
// ======================================================================================
function AbaApuracao({ campanha, regras, unidade, ehTrucks, diario, consultores, mecanicos, chefes, gerentes, metasUnidade, funcionarios, erroFunc,
  gerentesGerais, metasPorUnidade, blocosMatriz, ano, mes, modo = 'apuracao', versaoDados = 0 }) {
  const comum = { campanha, regras, unidade, diario, blocosMatriz, ano, mes, versaoDados, carregandoFunc: funcionarios === null }
  const ctx = useMemo(() => ({ faixas: faixasDe(regras, unidade) || [], regras, unidade, modo }), [regras, unidade, modo])

  return (
    <FaixasCtx.Provider value={ctx}>
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
    </FaixasCtx.Provider>
  )
}

// Faixas de pagamento e regras da empresa selecionada + modo da tabela: 'apuracao' (Contrib. e
// Faixa por semana) ou 'resultado' (Cálculo e Valor bônus por semana).
const FaixasCtx = createContext({ faixas: [], regras: null, unidade: null, modo: 'apuracao' })

// Bônus-alvo (aba Regras) de uma linha do quadro Bônus-alvo, já com as travas: Meta travada = sem
// bônus; Supermeta travada = Supermeta sem valor. Sem linha (função sem bônus na empresa) = 0.
function bonusAlvoDe(regras, unidade, chave) {
  const l = linhasBonus(regras, unidade, CAMPANHA.unidades).find((x) => x.k === chave)
  if (!l) return { meta: 0, supermeta: 0 }
  const travas = regras.bonusBloqueado?.[unidade] || {}
  const metaTravada = !!travas[`${chave}:meta`] || travas[chave] === true
  const superTravada = metaTravada || !!travas[`${chave}:super`]
  const meta = Number(lerCaminho(regras, l.meta)) || 0
  const sv = lerCaminho(regras, l.supermeta)
  const supermeta = sv == null && l.padraoSuper ? meta * 1.2 : Number(sv) || 0
  return { meta: metaTravada ? 0 : meta, supermeta: superTravada ? 0 : supermeta }
}

// Faixa em que o valor cai: a de maior "Atingimento ≥" que o valor alcança; o limite superior é o
// início da faixa seguinte (mesma leitura da tabela Faixas de pagamento da aba Regras).
function faixaDoValor(v, faixas) {
  if (v == null || !faixas.length) return null
  const ord = [...faixas].sort((a, b) => a.min - b.min)
  let i = -1
  ord.forEach((f, k) => { if (v >= f.min) i = k })
  if (i < 0) return { abaixo: true, min: ord[0].min }
  return { ...ord[i], max: ord[i + 1]?.min ?? null }
}

// ======================================================================================
// Blocos de cargo da Apuração — por pessoa e por semana: atingimento do Bloco 3 (soma peso ×
// atingimento de cada indicador, com a meta do mês proporcional aos dias úteis da semana).
// Contribuição da semana = soma peso × atingimento dos indicadores (escala da linha Total da Matriz).
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

// Atingimento e contribuição de cada semana de uma linha (pessoa).
function celulasDaLinha(p, pesoB3) {
  return p.semanas.map((w) => {
    // Bloco Consultores: a contribuição já vem pronta da Matriz KPIs (linha Total
    // do quadro), sem multiplicar por peso do bloco/semana de novo.
    if (Object.prototype.hasOwnProperty.call(w, 'contribDireta')) {
      return { ating: w.contribDireta, contrib: w.contribDireta }
    }
    // Demais cargos: contribuição da semana = soma peso × atingimento dos indicadores (mesma escala
    // da linha Total da Matriz KPIs), comparável direto com as Faixas de pagamento.
    const ating = atingimentoB3(w.itens)
    // Semana sem dia útil não conta.
    if (!w.fr) return { ating, contrib: null, semDiaUtil: true }
    return { ating, contrib: ating }
  })
}

// Total do mês de uma linha: Consultores = valor mensal da Matriz KPIs; demais = média das semanas
// ponderada pelos dias úteis (mesma escala das semanas). parcial = alguma semana sem dados.
function totalDaLinha(p, cels) {
  if (Object.prototype.hasOwnProperty.call(p, 'totalDireto')) return { total: p.totalDireto, parcial: p.totalDireto == null }
  let soma = 0, pesos = 0, parcial = false
  cels.forEach((c, i) => {
    if (c.semDiaUtil) return
    if (c.contrib == null) { parcial = true; return }
    const fr = p.semanas[i].fr || 0
    soma += c.contrib * fr
    pesos += fr
  })
  return { total: pesos ? soma / pesos : null, parcial }
}

const moedaBR = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Botão ⓘ do Resultado: abre o passo a passo do cálculo da semana. O quadro usa posição fixa (na
// tela), para não ser cortado pela rolagem horizontal da tabela. Fecha ao clicar fora, Esc ou rolar.
function InfoCalculo({ titulo, children }) {
  const [pos, setPos] = useState(null) // null = fechado
  const btn = useRef(null)
  const quadro = useRef(null)
  useEffect(() => {
    if (!pos) return undefined
    const fora = (e) => {
      if (quadro.current?.contains(e.target) || btn.current?.contains(e.target)) return
      setPos(null)
    }
    const fechar = () => setPos(null)
    const esc = (e) => { if (e.key === 'Escape') setPos(null) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [pos])
  const abrir = () => {
    if (pos) { setPos(null); return }
    const r = btn.current.getBoundingClientRect()
    const largura = 300
    const left = Math.max(8, Math.min(r.left, window.innerWidth - largura - 8))
    const abaixo = r.bottom + 260 < window.innerHeight
    setPos(abaixo ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 })
  }
  return (
    <>
      <button ref={btn} type="button" onClick={abrir} aria-expanded={!!pos} aria-label={`Como foi calculado: ${titulo}`}
        className="h-4 w-4 shrink-0 inline-flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <div ref={quadro} role="dialog" aria-label={titulo} style={{ position: 'fixed', width: 300, ...pos }}
          className="z-50 rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-xs leading-relaxed text-slate-600 text-left whitespace-normal font-normal">
          <p className="text-[12px] font-bold text-slate-800 mb-1.5">{titulo}</p>
          {children}
        </div>
      )}
    </>
  )
}

// Linha "rótulo ........ valor" do quadro de cálculo.
function LinhaCalc({ rotulo, valor, destaque = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-0.5 ${destaque ? 'border-t border-slate-200 mt-1 pt-1.5 font-bold text-slate-900' : ''}`}>
      <span className={destaque ? '' : 'text-slate-500'}>{rotulo}</span>
      <span className="tabular-nums text-right">{valor}</span>
    </div>
  )
}

// Resultado: mesma tabela da Apuração, uma coluna por semana com o Valor do bônus e um ⓘ com o
// cálculo: contribuição da semana → faixa (aba Regras) → % aplicado sobre o bônus × bônus-alvo da
// semana (Meta ou Supermeta, conforme "Aplicar sobre"; valor do mês ÷ nº de semanas do mês).
// Total = soma dos valores das semanas.
function ResultadoSemanal({ titulo, cor, campanha, linhas, carregando, vazio, pesoB3, faixas, regras, unidade, chaveBonus, matrizB3 }) {
  const semanas = campanha.semanas
  const nSem = semanas.length || 1
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums'
  const rotuloFaixaTxt = (fx) => (fx.max == null ? `≥ ${pctTxt(fx.min)}` : `${pctTxt(fx.min)} a < ${pctTxt(fx.max)}`)
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
          <table className="w-full min-w-[56rem] table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[26%]" />
              {semanas.map((s) => <col key={s.id} />)}
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-t border-slate-200">
                <th rowSpan={2} className={`${TH} text-left align-bottom border-b border-slate-200`}>Nome</th>
                <th colSpan={semanas.length} className={`${TH} text-center border-l border-slate-200`}>
                  <span className="inline-flex items-center gap-1">
                    Bloco 3 - Serviços ({pctTxt(pesoB3)}) — bônus por semana
                    <Info titulo="Bloco 3 - Serviços">
                      Matriz KPIs › {matrizB3}. A contribuição da semana define a faixa (Faixas de pagamento da aba Regras);
                      bônus da semana = % aplicado sobre o bônus × Meta ou Supermeta da semana (valor do mês ÷ nº de semanas).
                      Clique no ⓘ de cada semana para ver o cálculo.
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
                const alvo = bonusAlvoDe(regras, p.unidadeBonus ? 'TRUCKS' : unidade, p.chaveBonus || chaveBonus)
                const cels = celulasDaLinha(p, pesoB3)
                const calc = cels.map((c) => {
                  const fx = c.semDiaUtil ? null : faixaDoValor(c.contrib, faixas)
                  if (!fx || fx.abaixo || p.alerta) return { fx, valor: 0 }
                  const mensal = fx.base === 'supermeta' ? alvo.supermeta : alvo.meta
                  const base = mensal / nSem
                  return { fx, mensal, base, valor: base * (fx.paga || 0) }
                })
                const total = calc.reduce((a, c) => a + c.valor, 0)
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-800 whitespace-nowrap truncate" title={p.nome}>
                      {p.nome}
                      {p.alerta && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-px rounded border bg-red-50 text-red-700 border-red-200" title={p.alerta}>Mês zerado</span>
                      )}
                    </td>
                    {calc.map((k, i) => {
                      const c = cels[i]
                      const nomeBase = k.fx?.base === 'supermeta' ? 'Supermeta' : 'Meta'
                      let corpo
                      if (c.semDiaUtil) corpo = <p>Semana sem dia útil — não entra no cálculo.</p>
                      else if (c.contrib == null) corpo = <p>Sem contribuição calculada nesta semana (sem meta ou sem dados).</p>
                      else if (p.alerta) corpo = <><LinhaCalc rotulo="Contribuição da semana" valor={pctTxt(c.contrib)} /><p className="mt-1 text-red-600">{p.alerta}</p></>
                      else if (k.fx?.abaixo) {
                        corpo = (
                          <>
                            <LinhaCalc rotulo="Contribuição da semana" valor={pctTxt(c.contrib)} />
                            <LinhaCalc rotulo="1ª faixa a partir de" valor={pctTxt(k.fx.min)} />
                            <LinhaCalc rotulo="Valor do bônus" valor={`${moedaBR(0)} (sem faixa)`} destaque />
                          </>
                        )
                      } else {
                        corpo = (
                          <>
                            <LinhaCalc rotulo="Contribuição da semana" valor={pctTxt(c.contrib)} />
                            <LinhaCalc rotulo="Faixa" valor={rotuloFaixaTxt(k.fx)} />
                            <LinhaCalc rotulo="% aplicado sobre o bônus" valor={pctTxt(k.fx.paga)} />
                            <LinhaCalc rotulo="Aplicar sobre" valor={nomeBase} />
                            <LinhaCalc rotulo={`${nomeBase} do mês`} valor={moedaBR(k.mensal)} />
                            <LinhaCalc rotulo={`${nomeBase} da semana (÷ ${nSem})`} valor={moedaBR(k.base)} />
                            <LinhaCalc rotulo={`${pctTxt(k.fx.paga)} × ${moedaBR(k.base)}`} valor={moedaBR(k.valor)} destaque />
                          </>
                        )
                      }
                      return (
                        <td key={semanas[i].id} className={`${TD} border-l border-slate-200`}>
                          <span className="inline-flex items-center justify-end gap-1.5 w-full">
                            <InfoCalculo titulo={`${p.nome} · Sem ${i + 1} (${semanas[i].label})`}>{corpo}</InfoCalculo>
                            <span className={`font-semibold ${k.valor > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{moedaBR(k.valor)}</span>
                          </span>
                        </td>
                      )
                    })}
                    <td className={`${TD} border-l border-slate-200 font-bold ${COR_TOTAL.real} ${total > 0 ? 'text-emerald-700' : 'text-slate-500'}`}
                      title="Soma dos valores de bônus das semanas">
                      {moedaBR(total)}
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

// Card de uma função: uma linha por pessoa, uma coluna por semana com a contribuição do Bloco 3
// na semana, e o Total = soma das semanas. linhas: [{ id, nome, alerta?, semanas: [{ fr, itens }] }]
function ResumoSemanal({ titulo, cor, campanha, linhas, carregando, vazio, blocosMatriz, matrizB3, chaveBonus }) {
  const VAZIO = <span className="text-slate-300">—</span>
  const pesoB3 = blocosMatriz.pesos?.individual || 0
  const semanas = campanha.semanas
  const { faixas, regras, unidade, modo } = useContext(FaixasCtx)
  if (modo === 'resultado') {
    return <ResultadoSemanal titulo={titulo} cor={cor} campanha={campanha} linhas={linhas} carregando={carregando} vazio={vazio}
      pesoB3={pesoB3} faixas={faixas} regras={regras} unidade={unidade} chaveBonus={chaveBonus} matrizB3={matrizB3} />
  }
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums border-l border-slate-200'
  const TDF = 'p-2 text-center whitespace-nowrap tabular-nums'
  const rotuloFaixa = (fx) => (fx.max == null ? `≥ ${pctTxt(fx.min)}` : `${pctTxt(fx.min)} a < ${pctTxt(fx.max)}`)
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
          <table className="w-full min-w-[80rem] table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[16%]" />
              {semanas.map((s) => <React.Fragment key={s.id}><col className="w-[6%]" /><col /></React.Fragment>)}
              <col className="w-[7%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-t border-slate-200">
                <th rowSpan={3} className={`${TH} text-left align-bottom border-b border-slate-200`}>Nome</th>
                <th colSpan={semanas.length * 2} className={`${TH} text-center border-l border-slate-200`}>
                  <span className="inline-flex items-center gap-1">
                    Bloco 3 - Serviços ({pctTxt(pesoB3)}) — contribuição por semana
                    <Info titulo="Bloco 3 - Serviços">
                      Matriz KPIs › {matrizB3}. Contribuição da semana = soma de peso × atingimento de cada indicador
                      (como a linha Total da Matriz). A Faixa é a da tabela Faixas de pagamento em que essa contribuição cai.
                    </Info>
                  </span>
                </th>
                <th rowSpan={3} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Total</th>
              </tr>
              <tr className="bg-slate-50">
                {semanas.map((s, i) => (
                  <th key={s.id} colSpan={2} className={`${TH} text-center border-l border-slate-200`} title={s.label}>
                    Sem {i + 1}
                    <span className="block text-[9px] font-medium normal-case tracking-normal text-slate-400">{s.label}</span>
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {semanas.map((s) => (
                  <React.Fragment key={s.id}>
                    <th className={`${TH} text-right border-l border-slate-200`} title="Contribuição">Contrib.</th>
                    <th className={`${TH} text-center`} title="Faixa de pagamento (aba Regras) em que o valor da semana se encaixa">Faixa</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => {
                const cels = celulasDaLinha(p, pesoB3)
                const temTotalDireto = Object.prototype.hasOwnProperty.call(p, 'totalDireto')
                const { total, parcial } = totalDaLinha(p, cels)
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
                      const temContribDireta = Object.prototype.hasOwnProperty.call(w, 'contribDireta')
                      const linhaAting = `Atingimento da semana: ${c.ating == null ? '—' : pctTxt(c.ating)}`
                      const linhaPeso = temContribDireta ? 'Contribuição da semana (Matriz KPIs)' : 'Contribuição = soma peso × atingimento dos indicadores'
                      const tituloCel = c.semDiaUtil ? 'Semana sem dia útil' : `${linhaAting}\n${linhaPeso}\n${detalhe}`
                      // Faixa pelo valor da contribuição da semana.
                      const fx = c.semDiaUtil ? null : faixaDoValor(c.contrib, faixas)
                      return (
                        <React.Fragment key={semanas[i].id}>
                          <td className={TD} title={tituloCel}>
                            {c.semDiaUtil || c.contrib == null ? VAZIO : pctTxt(c.contrib)}
                          </td>
                          <td className={TDF}
                            title={!fx ? undefined : fx.abaixo
                              ? `Abaixo da 1ª faixa (${pctTxt(fx.min)}) — não paga`
                              : `Faixa ${rotuloFaixa(fx)} · paga ${pctTxt(fx.paga)} do bônus da ${fx.base === 'supermeta' ? 'Supermeta' : 'Meta'}`}>
                            {!fx ? VAZIO : fx.abaixo
                              ? <span className="text-[10px] font-semibold text-red-600">Sem faixa</span>
                              : (
                                <span className={`inline-block text-[10px] font-semibold px-1.5 py-px rounded border ${fx.base === 'supermeta' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                  {rotuloFaixa(fx)}
                                </span>
                              )}
                          </td>
                        </React.Fragment>
                      )
                    })}
                    <td className={`${TD} font-bold ${COR_TOTAL.real}`}
                      title={parcial ? (temTotalDireto ? 'Sem meta ou sem dados no mês' : 'Parcial: semanas sem meta ou sem dados ficaram de fora') : (temTotalDireto ? 'Contribuição do mês (Matriz KPIs)' : 'Contribuição do mês: média das semanas ponderada pelos dias úteis')}>
                      {total == null ? VAZIO : <span className={corPct(total)}>{pctTxt(total)}{parcial ? '*' : ''}</span>}
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

function BlocoConsultores({ campanha, unidade, blocosMatriz, consultores, carregandoFunc, erroFunc, ano, mes, versaoDados = 0 }) {
  const u = unidadeDe(campanha, unidade)
  const { agrupamentoCargo: agrupamento, departamento } = CAMPANHA.funcoes.consultor

  // Semanas da Matriz KPIs (s01..s70) do mês escolhido, na mesma ordem das colunas Sem 1, Sem 2...
  const sKeys = useMemo(() => semanasMatrizDoMes(ano, mes), [ano, mes])
  const mKey = `m${String(mes).padStart(2, '0')}`

  // Contribuição de cada consultor em cada semana: lida ao vivo do quadro CONSULTOR DE SERVIÇOS
  // da Matriz KPIs (mesma linha "Total" da tabela), filtrado pelo nome do consultor — não é mais
  // recalculada aqui a partir de fato_campanha_diario.
  const [porConsultor, setPorConsultor] = useState(new Map())
  const [carregandoMatriz, setCarregandoMatriz] = useState(false)
  useEffect(() => {
    let ativo = true
    // Sem consultores/semanas: desliga o "Carregando…" (senão fica preso se uma carga anterior foi
    // cancelada no meio, ex.: troca de empresa).
    if (!consultores.length || !sKeys.length) { setPorConsultor(new Map()); setCarregandoMatriz(false); return undefined }
    setCarregandoMatriz(true)
    const vazio = () => ({ semanas: sKeys.map(() => ({ contrib: null, itens: [] })), mensal: { contrib: null, itens: [] } })
    // Limite por consultor: se o backend não responder em 60 s, a linha fica "—" em vez de travar a tabela.
    const comLimite = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 60_000))])
    Promise.all(consultores.map(async (c) => {
      try {
        // Depois de uma atualização (versaoDados > 0), ignora o cache em memória e lê de novo.
        const res = await comLimite(fetchBloco3Servicos({ year: Number(ano), consultor: c.nome, _forceReload: versaoDados > 0 }))
        // Backend fora do ar → kpiService devolve dados de EXEMPLO (mock): não usar como realizado.
        if (res?.source === 'mock') return [c.id, vazio()]
        const quadro = (res?.data || []).find((q) => q.tituloGerente === 'CONSULTOR DE SERVIÇOS')
        return [c.id, { semanas: sKeys.map((sKey) => contribSemanaMatriz(quadro, sKey)), mensal: contribSemanaMatriz(quadro, mKey) }]
      } catch {
        return [c.id, vazio()]
      }
    }))
      .then((entradas) => { if (ativo) setPorConsultor(new Map(entradas)) })
      .finally(() => { if (ativo) setCarregandoMatriz(false) })
    return () => { ativo = false }
  }, [consultores, ano, sKeys, mKey, versaoDados])

  const linhas = consultores.map((c) => {
    const dados = porConsultor.get(c.id)
    const semanasMatriz = dados?.semanas || sKeys.map(() => ({ contrib: null, itens: [] }))
    return {
      id: c.id,
      nome: c.nome,
      totalDireto: dados?.mensal?.contrib ?? null,
      semanas: campanha.semanas.map((s, i) => ({
        itens: semanasMatriz[i]?.itens || [],
        contribDireta: semanasMatriz[i]?.contrib ?? null,
      })),
    }
  })

  return (
    <>
      {erroFunc && <p className="text-xs text-red-600">Não foi possível carregar os funcionários: {erroFunc}</p>}
      <ResumoSemanal titulo="Consultores de Serviços" cor={CORES_FUNCAO.consultor} campanha={campanha} linhas={linhas} chaveBonus="consultor"
        blocosMatriz={blocosMatriz} matrizB3="Bloco 3 - Serviços › Consultor de Serviços"
        carregando={carregandoFunc || carregandoMatriz}
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
    <ResumoSemanal titulo="Mecânicos" cor={CORES_FUNCAO.mecanico} campanha={campanha} linhas={linhas} chaveBonus="mecanico"
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
    <ResumoSemanal titulo="Chefe de Oficina" cor={CORES_FUNCAO.chefe} campanha={campanha} linhas={linhas} chaveBonus="chefe"
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
    <ResumoSemanal titulo={unidade === 'CG' ? 'Gerente de Serviços' : 'Gerente de Filial'} cor={CORES_FUNCAO.gerente} campanha={campanha} linhas={linhas} chaveBonus="gerente"
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
      chaveBonus: `gg-${x.id}`, // linha "Gerente Geral · <unidade>" do Bônus-alvo de CAIOBÁ TRUCKS
      unidadeBonus: x.id, // dias úteis da semana pelo calendário da unidade
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


// Semanas do mês escolhido e dias úteis de cada uma (Calendário de cada empresa: sábado = 0,5,
// feriado = 0) + Bônus-alvo editável (Meta e Supermeta) da empresa selecionada.
// Texto para os colaboradores entenderem a campanha (topo da aba Regras). Não é editável: é montado
// a partir das regras da empresa/mês (nº de semanas etc.) e acompanha o que for sendo configurado.
// As faixas reais ficam só na tabela Faixas de pagamento abaixo; aqui vai apenas um exemplo.
function ComoFunciona({ nSemanas }) {
  const passo = 'flex gap-3'
  const num = 'h-6 w-6 shrink-0 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center'
  return (
    <section className={`${CARD} p-5 space-y-4 bg-gradient-to-br from-blue-50/60 to-white`}>
      <div>
        <h2 className="text-base font-bold text-slate-900">🏆 Como funciona a Campanha Pós-Venda</h2>
        <p className="text-xs text-slate-600 mt-1">
          A campanha premia, semana a semana, quem alcança os resultados do seu cargo. Quanto melhor o seu resultado na semana, maior o bônus. 💪
        </p>
      </div>

      <ol className="space-y-3 text-xs text-slate-700 leading-relaxed">
        <li className={passo}>
          <span className={num}>1</span>
          <div>
            <b>🎯 Suas metas.</b> Cada cargo é avaliado pelos indicadores do <b>Bloco 3 - Serviços</b> da Matriz KPIs,
            com as metas aprovadas no Planejamento de Metas ou definidas na própria Matriz KPIs.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>2</span>
          <div>
            <b>📅 Apuração toda semana.</b> O mês poderá ter <b>4 ou 5 semanas</b> (as mesmas da Matriz KPIs, veja a tabela abaixo).
            Em cada semana é calculada a <b>soma da contribuição</b>, que será o valor extraído de contribuição de cada
            indicador que possuir valores de pesos.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>3</span>
          <div>
            <b>📊 Faixa de pagamento.</b> A contribuição da semana mostra em qual faixa você ficou, e cada faixa
            diz quanto do bônus você recebe — sobre a <b>Meta</b> ✅ ou, nas faixas mais altas, sobre a <b>Supermeta</b> 🚀.
            Por exemplo: se a sua contribuição na semana foi de 85% e a faixa de 80% a 90% paga 50% da Meta, você recebe
            50% do bônus da Meta naquela semana. As faixas do mês estão na tabela <b>Faixas de pagamento</b>, mais abaixo.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>4</span>
          <div>
            <b>💰 Valor da semana.</b> Bônus da semana = <b>% aplicado sobre o bônus × bônus-alvo da semana</b>.
            O bônus-alvo da semana é o valor do mês (Meta ou Supermeta, tabela Bônus-alvo) dividido pela quantidade de semanas do mês.
            {' '}Abaixo da 1ª faixa, a semana não paga.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>5</span>
          <div>
            <b>➕ Total do mês.</b> O bônus do mês é a <b>soma das semanas</b> — uma semana fraca não apaga as boas. 😉
            O pagamento é feito no mês seguinte.
          </div>
        </li>
      </ol>

      <div className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700">
        <b>🧮 Exemplo:</b> Meta do mês R$ 1.500,00 em {nSemanas} semanas = R$ {moedaTxt(1500 / (nSemanas || 1))} por semana.
        Contribuição de 85% na semana → faixa que paga 50% da Meta → 50% × R$ {moedaTxt(1500 / (nSemanas || 1))} =
        <b> R$ {moedaTxt((1500 / (nSemanas || 1)) * 0.5)}</b> naquela semana.
      </div>

      <ul className="space-y-1 text-[11px] text-slate-500">
        <li>⚠️ Participa quem está com o cadastro <b>“1 - Trabalhando”</b> durante a campanha.</li>
        <li>⚠️ Mecânicos com eficiência do mês acima do limite da regra têm o bônus do mês zerado.</li>
        <li>ℹ️ Os resultados de cada semana podem ser acompanhados nas abas <b>Apuração</b> e <b>Resultado</b>.</li>
      </ul>
    </section>
  )
}

// Botão de engrenagem com um menu de ações (fecha ao clicar fora ou Esc).
function MenuEngrenagem({ itens }) {
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
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-haspopup="menu"
        title="Mais ações" aria-label="Mais ações"
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
        <Settings className="h-4 w-4" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-64 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {itens.map(({ rotulo, icone: Icone, onClick, desabilitado, dica }) => (
            <button key={rotulo} type="button" role="menuitem" disabled={desabilitado} title={dica}
              onClick={() => { setAberto(false); onClick() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left disabled:opacity-50">
              <Icone className={`h-3.5 w-3.5 text-slate-500 ${desabilitado ? 'animate-spin' : ''}`} /> {rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AbaRegras({ slotAcoes, campanha, unidade, semCalendario, nomeMes, ano, mes, regras, onSalvar, origemRegras, nomeEmpresa }) {
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
  // Bônus-alvo é do mês: por semana = valor ÷ nº de semanas do mês (5 semanas ÷ 5, 4 semanas ÷ 4).
  const nSemanas = campanha.semanas.length || 1
  const porSemana = (v) => `R$ ${moedaTxt((Number(v) || 0) / nSemanas)}`
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

  // Zerar valores: Meta e Supermeta de todas as linhas do Bônus-alvo desta empresa = 0 (faixas e
  // travas ficam como estão). Só altera o rascunho — vale depois de Salvar.
  const zerarValores = () => {
    let r = rascunho
    for (const l of linhasBonus(rascunho, unidade, campanha.unidades)) {
      r = comValor(r, l.meta, 0)
      if (l.supermeta) r = comValor(r, l.supermeta, 0)
    }
    setRascunho(r)
    setMsg({ erro: false, txt: 'Valores zerados — clique em Salvar para gravar.' })
  }

  // Copiar do mês anterior: traz as regras gravadas desta empresa no mês anterior (Bônus-alvo,
  // travas e Faixas). Sem nada salvo lá, usa a última regra salva antes dele. Vale depois de Salvar.
  const [copiando, setCopiando] = useState(false)
  const anterior = Number(mes) === 1 ? { ano: Number(ano) - 1, mes: 12 } : { ano: Number(ano), mes: Number(mes) - 1 }
  const nomeMesAnterior = `${MESES[anterior.mes - 1].label}/${anterior.ano}`
  const copiarMesAnterior = async () => {
    setCopiando(true)
    setMsg(null)
    try {
      const linha = await apiService.getCampanhaRegras(anterior.ano, anterior.mes, unidade)
      if (!linha?.dados) {
        setMsg({ erro: true, txt: `Nada salvo em ${nomeMesAnterior} para ${nomeEmpresa}.` })
        return
      }
      setRascunho(mesclarRegras(REGRAS_PADRAO, linha.dados))
      const deOnde = linha.unidade === 'GERAL' ? 'regra geral' : nomeEmpresa
      setMsg({ erro: false, txt: `Copiado de ${MESES[Number(linha.mes) - 1]?.label}/${linha.ano} (${deOnde}) — clique em Salvar para gravar.` })
    } catch (err) {
      setMsg({ erro: true, txt: `Não foi possível copiar: ${err.message || err}` })
    } finally {
      setCopiando(false)
    }
  }

  // Salvar/Descartar gravam todas as regras da aba de uma vez (Bônus-alvo e Faixas). Ficam na linha
  // das abas (slotAcoes, via portal), com a engrenagem de Zerar valores / Copiar do mês anterior.
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
      <MenuEngrenagem itens={[
        { rotulo: 'Zerar valores', icone: Eraser, onClick: zerarValores, dica: 'Meta e Supermeta do Bônus-alvo = R$ 0,00' },
        { rotulo: 'Copiar do mês anterior', icone: copiando ? Loader2 : Copy, onClick: copiarMesAnterior, desabilitado: copiando, dica: `Copiar as regras de ${nomeMesAnterior}` },
      ]} />
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
      {/* Um só Salvar para a aba inteira (na linha das abas): grava as regras DESTA empresa para o mês/ano. */}
      {slotAcoes ? createPortal(botoesSalvar, slotAcoes) : <div className="flex justify-end">{botoesSalvar}</div>}
      <ComoFunciona nSemanas={nSemanas} />
    <div className="grid grid-cols-1 gap-5">
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
                  <td className="p-2 font-semibold text-slate-700 whitespace-nowrap">
                    Sem {s.id.slice(1)} <span className="font-normal text-slate-400">(Semana {s.numero})</span>
                  </td>
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
                  <th className={`${TH} text-right`} title={`Meta ÷ ${nSemanas} semanas do mês`}>Meta / semana</th>
                  <th className={`${TH} text-right`}>Supermeta</th>
                  <th className={`${TH} text-right`} title={`Supermeta ÷ ${nSemanas} semanas do mês`}>Supermeta / semana</th>
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
                      <td className="p-2 text-right tabular-nums whitespace-nowrap text-slate-600">
                        {metaTravada ? '—' : porSemana(lerCaminho(rascunho, l.meta))}
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
                      <td className="p-2 text-right tabular-nums whitespace-nowrap text-slate-600">
                        {!l.supermeta || superTravada ? '—' : porSemana(valorSuper(l))}
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
                <th className={`${TH} text-left`}>% aplicado sobre o bônus</th>
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
                    <td className="p-1.5"><PctInput rotulo="% aplicado sobre o bônus" value={f.paga} onChange={(v) => setFaixa(f.id, 'paga', v)} /></td>
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
