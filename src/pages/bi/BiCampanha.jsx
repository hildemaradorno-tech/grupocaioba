import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Calculator, BookOpen, BarChart2, Loader2, RefreshCw, Save, Info as InfoIcon } from 'lucide-react'
import { apiService } from '../../services/api'
import { sincronizarCampanha } from '../../services/kpiService'
import { useAuth } from '../../context/AuthContext'
import {
  CAMPANHA, PONTOS_A_CONFIRMAR, REGRAS_PADRAO, FAIXAS_IDS, montarSemanas, pesoSemana, pesoTotal, pctTxt,
  mesclarRegras, faixaDaUnidade, metasAprovadasDaUnidade, metaDoConsultor,
} from '../../utils/campanhaPosVenda'

// BI da Campanha de Bônus do Pós-Venda.
//   Regras   = regras do regulamento, editáveis e salvas por mês (fato_campanha_regras) + metas
//              aprovadas no Planejamento de Metas
//   Apuração = blocos por função (Meta × Realizado × %), por semana ou mês
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

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

const CORES_FUNCAO = {
  consultor: '#2563eb', mecanico: '#0891b2', box: '#64748b', chefe: '#7c3aed', prog: '#d97706', gerente: '#059669',
}

const tierChip = (tier) => {
  if (tier === 0) return 'bg-red-50 text-red-700 border-red-200'
  if (tier < 1) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (tier === 1) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
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
// Cargos existentes no agrupamento de uma função na unidade (para marcar na aba Regras).
function cargosDoAgrupamento(funcionarios, u, funcao) {
  return [...new Set(doAgrupamento(funcionarios, u, funcao).map((f) => normNome(f.cargo_nome)).filter(Boolean))].sort()
}
// Cargos existentes no agrupamento de Mecânicos da unidade (para marcar na aba Regras).
function cargosDoAgrupamentoMecanico(funcionarios, u) {
  return [...new Set(doAgrupamento(funcionarios, u, 'mecanico').map((f) => normNome(f.cargo_nome)).filter(Boolean))].sort()
}

// Cópia imutável de obj com o valor trocado no caminho (ex.: ['funcoes', 'consultor', 'alvo', 'CG']).
function comValor(obj, caminho, valor) {
  if (!caminho.length) return valor
  const [k, ...resto] = caminho
  const copia = Array.isArray(obj) ? [...obj] : { ...(obj || {}) }
  copia[k] = comValor(copia[k], resto, valor)
  return copia
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

  // Regras vigentes no mês (fato_campanha_regras): as do mês, senão as do último mês salvo,
  // senão o padrão do regulamento. "regras" é o que está na tela (a Apuração já usa);
  // "regrasBase" é o que está salvo — a diferença entre os dois mostra o aviso de não salvo.
  const [regras, setRegras] = useState(REGRAS_PADRAO)
  const [regrasBase, setRegrasBase] = useState(REGRAS_PADRAO)
  const [regrasSalvas, setRegrasSalvas] = useState(null)
  const [salvandoRegras, setSalvandoRegras] = useState(false)
  const [msgRegras, setMsgRegras] = useState(null)
  useEffect(() => {
    let vivo = true
    setMsgRegras(null)
    apiService.getCampanhaRegras(Number(ano), Number(mes))
      .then((linha) => {
        if (!vivo) return
        const base = mesclarRegras(REGRAS_PADRAO, linha?.dados)
        setRegras(base)
        setRegrasBase(base)
        setRegrasSalvas(linha)
      })
      .catch((err) => { if (vivo) setMsgRegras({ erro: true, txt: `Não foi possível carregar as regras: ${err.message || err}` }) })
    return () => { vivo = false }
  }, [ano, mes])
  const alterado = JSON.stringify(regras) !== JSON.stringify(regrasBase)
  const alterar = (caminho, valor) => { setRegras((r) => comValor(r, caminho, valor)); setMsgRegras(null) }
  const pesosInvalidos = ['consultor', 'chefe', 'prog', 'gerente'].filter((k) => {
    const soma = Object.values(regras.funcoes[k].pesos || {}).reduce((a, v) => a + (Number(v) || 0), 0)
    return Math.abs(soma - 1) >= 0.0001
  })
  const salvarRegras = async () => {
    if (pesosInvalidos.length) { setMsgRegras({ erro: true, txt: 'Os pesos de todas as funções precisam somar 100%.' }); return }
    setSalvandoRegras(true)
    try {
      await apiService.salvarCampanhaRegras(Number(ano), Number(mes), regras, user?.email || null)
      setRegrasBase(regras)
      setRegrasSalvas({ ano: Number(ano), mes: Number(mes), dados: regras, atualizado_em: new Date().toISOString(), atualizado_por: user?.email || null })
      setMsgRegras({ erro: false, txt: 'Regras salvas.' })
    } catch (err) {
      setMsgRegras({ erro: true, txt: `Não foi possível salvar: ${err.message || err}` })
    } finally {
      setSalvandoRegras(false)
    }
  }
  const nomeMesDe = (m) => MESES.find((x) => Number(x.v) === Number(m))?.label
  const origemRegras = !regrasSalvas
    ? 'usando o padrão do regulamento (nada salvo ainda).'
    : Number(regrasSalvas.ano) === Number(ano) && Number(regrasSalvas.mes) === Number(mes)
      ? `salvas para este mês em ${dataHora(regrasSalvas.atualizado_em)}${regrasSalvas.atualizado_por ? ` por ${regrasSalvas.atualizado_por}` : ''}.`
      : `usando as regras de ${nomeMesDe(regrasSalvas.mes)}/${regrasSalvas.ano} (último mês salvo). Ao salvar, ficam gravadas para este mês.`

  const { semanas, semCalendario } = useMemo(
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

  const u = campanha.unidades.find((x) => x.id === unidade)
  const consultores = useMemo(() => consultoresDaUnidade(funcionarios, u), [funcionarios, u])
  const metasUnidade = useMemo(() => metasAprovadasDaUnidade(metasAprovadas, u.empresaId), [metasAprovadas, u.empresaId])
  const mecanicos = useMemo(() => mecanicosDaUnidade(funcionarios, u, regras), [funcionarios, u, regras])
  const cargosMecanico = useMemo(() => cargosDoAgrupamentoMecanico(funcionarios, u), [funcionarios, u])
  const chefes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'chefe'), [funcionarios, u, regras])
  const gerentes = useMemo(() => porCargosDaUnidade(funcionarios, u, regras, 'gerente'), [funcionarios, u, regras])
  const cargosGerente = useMemo(() => cargosDoAgrupamento(funcionarios, u, 'gerente'), [funcionarios, u])
  const cargosChefe = useMemo(() => cargosDoAgrupamento(funcionarios, u, 'chefe'), [funcionarios, u])

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
        {CAMPANHA.unidades.map((x) => (
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

      {alterado && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">As regras foram alteradas e ainda não foram salvas. A Apuração já mostra o efeito das alterações.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRegras(regrasBase); setMsgRegras(null) }}
              className="px-3 py-1 rounded-md text-xs font-semibold text-amber-800 border border-amber-300 bg-white hover:bg-amber-100">Descartar</button>
            <button onClick={salvarRegras} disabled={salvandoRegras}
              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">Salvar regras</button>
          </div>
        </div>
      )}

      {aba === 'regras' && (
        <AbaRegras campanha={campanha} semCalendario={semCalendario} ano={ano} mes={mes} nomeMes={nomeMes} unidade={unidade}
          consultores={consultores} metasUnidade={metasUnidade} carregandoMetas={metasAprovadas === null}
          regras={regras} alterar={alterar} cargosMecanico={cargosMecanico} cargosChefe={cargosChefe} cargosGerente={cargosGerente} origemRegras={origemRegras} alterado={alterado} salvando={salvandoRegras}
          msgRegras={msgRegras} onSalvar={salvarRegras} onRestaurarPadrao={() => { setRegras(REGRAS_PADRAO); setMsgRegras(null) }} />
      )}
      {aba === 'apuracao' && (
        <AbaApuracao campanha={campanha} regras={regras} unidade={unidade} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} />
      )}
      {aba === 'resultado' && <AbaResultado />}
    </div>
  )
}

// ======================================================================================
// Apuração — um bloco por função; unidade e período (semana ou mês) valem para todos
// ======================================================================================
function AbaApuracao({ campanha, regras, unidade, diario, consultores, mecanicos, chefes, gerentes, metasUnidade, funcionarios, erroFunc }) {
  const [periodoSel, setPeriodo] = useState('S1')
  // Ao trocar de mês o nº de semanas muda — se a semana escolhida não existir, volta para a 1ª.
  const periodo = periodoSel === 'MES' || campanha.semanas.some((s) => s.id === periodoSel) ? periodoSel : 'S1'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {[...campanha.semanas.map((s) => [s.id, `Sem ${s.id.slice(1)} · ${s.label}`]), ['MES', 'Fechamento do mês']].map(([k, label]) => (
          <button key={k} onClick={() => setPeriodo(k)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
              periodo === k ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <BlocoConsultores campanha={campanha} regras={regras} unidade={unidade} periodo={periodo} diario={diario}
        consultores={consultores} metasUnidade={metasUnidade} carregandoFunc={funcionarios === null} erroFunc={erroFunc} />

      <BlocoMecanicos campanha={campanha} regras={regras} unidade={unidade} periodo={periodo} diario={diario}
        mecanicos={mecanicos} carregandoFunc={funcionarios === null} />

      <BlocoChefe campanha={campanha} regras={regras} unidade={unidade} periodo={periodo} diario={diario} chefes={chefes}
        mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUnidade} carregandoFunc={funcionarios === null} />

      <BlocoGerente campanha={campanha} regras={regras} unidade={unidade} periodo={periodo} diario={diario} gerentes={gerentes}
        mecanicos={mecanicos} consultores={consultores} metasUnidade={metasUnidade} carregandoFunc={funcionarios === null} />
    </div>
  )
}

// ======================================================================================
// Bloco Consultores de Serviços — Meta × Realizado × % (semana selecionada ou mês)
// Realizado = soma de fato_campanha_diario no período (Recepcionista: serviços, peças,
// margem de peças e OS). Ticket médio = faturamento ÷ OS distintas do período.
// ======================================================================================
function BlocoConsultores({ campanha, regras, unidade, periodo, diario, consultores, metasUnidade, carregandoFunc, erroFunc }) {
  const u = campanha.unidades.find((x) => x.id === unidade)
  const { agrupamentoCargo: agrupamento, departamento } = CAMPANHA.funcoes.consultor
  // Regras da aba Regras: pesos, bônus-alvo da unidade, margem mínima e faixas pagas na unidade.
  const { pesos, alvo, margemMinimaPecas } = regras.funcoes.consultor
  const alvoMes = alvo[unidade] || 0
  const pt = pesoTotal(campanha, unidade)
  const nSem = campanha.semanas.length
  const mensal = periodo === 'MES'
  const sem = campanha.semanas.find((s) => s.id === periodo)
  const fr = mensal ? 1 : (pt ? pesoSemana(sem, unidade) / pt : 0)
  // Dias úteis do período (Calendário da empresa): a semana escolhida ou o mês inteiro.
  const diasUteis = mensal ? pt : pesoSemana(sem, unidade)

  // Linhas do diário da unidade no período, agrupadas por pessoa do ERP.
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
  const doErp = (c) => porPessoa.get(c.nomeErp)
    || (c.codigo && [...porPessoa.values()].find((a) => a.codigo === c.codigo))
    || null

  const linhas = consultores.map((c) => {
    const meta = metaDoConsultor(metasUnidade, c) // Planejamento de Metas aprovado
    const erp = doErp(c)
    const metaServ = meta ? meta.serv * fr : null
    const metaPecas = meta ? meta.pecas * fr : null
    const metaTot = meta ? metaServ + metaPecas : null
    const metaMb = meta?.mb ?? null
    const metaTicket = meta?.ticket ?? null
    const serv = erp?.serv || 0
    const pecas = erp?.pecas || 0
    const realTot = serv + pecas
    const ticket = erp && erp.os.size ? realTot / erp.os.size : 0
    const mb = erp && erp.pecas ? erp.margem / erp.pecas : 0
    const pFat = metaTot ? realTot / metaTot : null
    const pTicket = metaTicket ? ticket / metaTicket : null
    const pMb = metaMb ? mb / metaMb : null
    let at = null, tier = null, bonus = null, motivo = null
    if (!mensal && pFat != null && pTicket != null && pMb != null) {
      at = pesos.faturamento * pFat + pesos.ticket * pTicket + pesos.margem * pMb
      const { faixa: fx, paga } = faixaDaUnidade(at, regras, unidade)
      tier = paga
      if (fx && !paga) motivo = `Faixa ${pctTxt(fx.min)} não é paga nesta unidade`
      if (margemMinimaPecas > 0 && pecas > 0 && mb < margemMinimaPecas) { tier = 0; motivo = `Margem de peças abaixo do mínimo de ${pctTxt(margemMinimaPecas)}` }
      bonus = alvoMes / (nSem || 1) * tier
    }
    return { c, metaServ, metaPecas, metaTot, metaMb, metaTicket, serv, pecas, realTot, ticket, mb, pFat, pTicket, pMb, at, tier, bonus, motivo, semErp: !erp }
  })

  const VAZIO = <span className="text-slate-300">—</span>
  const num = (v) => (v == null ? VAZIO : <span className="tabular-nums">{brl(v)}</span>)
  const pct = (v) => (v == null ? VAZIO : <span className={`tabular-nums font-semibold ${corPct(v)}`}>{pctTxt(v)}</span>)
  const TD = 'p-2 text-right whitespace-nowrap'
  const G = 'border-l border-slate-200'

  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_FUNCAO.consultor }} />
          Consultores de Serviços
        </p>
        {erroFunc && <p className="text-xs text-red-600 mt-1">Não foi possível carregar os funcionários: {erroFunc}</p>}
      </div>

      {carregandoFunc || diario === null ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-500">
          Nenhum funcionário "1 - Trabalhando" de {u.nome} com cargo no agrupamento "{agrupamento}" e departamento {departamento}. Confira o cadastro em Funcionários.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th rowSpan={2} className="p-2 text-left align-bottom">Consultor</th>
                <th rowSpan={2} className={`p-2 text-right align-bottom whitespace-nowrap ${G}`}>Dias úteis</th>
                <th colSpan={7} className={`p-1.5 text-center ${G}`}>Faturamento</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Ticket médio</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Margem de peças</th>
                {!mensal && <th colSpan={2} className={`p-1.5 text-center ${G}`}>Resultado da semana</th>}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* [linha de cima, linha de baixo, borda à esquerda] */}
                {[
                  ['Meta', 'Peças', true], ['Meta', 'Serviços'], ['Meta', 'Total', false, 'meta'],
                  ['Realizado', 'Peças', true], ['Realizado', 'Serviços'], ['Realizado', 'Total', false, 'real'], ['', '%', true],
                  ['', 'Meta', true], ['', 'Realizado', false, 'real'], ['', '%'],
                  ['', 'Meta', true], ['', 'Realizado', false, 'real'], ['', '%'],
                  ...(mensal ? [] : [['', 'Atingimento', true], ['', 'Bônus']]),
                ].map(([cima, baixo, borda, destaque], i) => (
                  <th key={i} className={`${TH} text-right align-bottom whitespace-nowrap ${borda ? G : ''} ${destaque ? COR_TOTAL[destaque] : ''}`}>
                    {cima && <span className="block text-slate-400">{cima}</span>}
                    <span className="block">{baixo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.c.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium text-slate-800 whitespace-nowrap"
                    title={l.semErp ? 'Sem movimento no ERP no período (ou nome diferente do cadastro)' : undefined}>
                    {l.c.nome}
                  </td>
                  <td className={`${TD} ${G} tabular-nums text-slate-600`}>{diasUteis.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td className={`${TD} ${G} text-slate-500`}>{num(l.metaPecas)}</td>
                  <td className={`${TD} text-slate-500`}>{num(l.metaServ)}</td>
                  <td className={`${TD} text-slate-700 font-semibold ${COR_TOTAL.meta}`}>{num(l.metaTot)}</td>
                  <td className={`${TD} ${G}`}>{num(l.pecas)}</td>
                  <td className={TD}>{num(l.serv)}</td>
                  <td className={`${TD} font-semibold text-slate-800 ${COR_TOTAL.real}`}>{num(l.realTot)}</td>
                  <td className={`${TD} ${G}`}>{pct(l.pFat)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{l.metaTicket != null ? num(l.metaTicket) : VAZIO}</td>
                  <td className={`${TD} ${COR_TOTAL.real}`}>{num(l.ticket)}</td>
                  <td className={TD}>{pct(l.pTicket)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{l.metaMb != null ? pctTxt(l.metaMb) : VAZIO}</td>
                  <td className={`${TD} ${COR_TOTAL.real}`}>{pctTxt(l.mb)}</td>
                  <td className={TD}>{pct(l.pMb)}</td>

                  {!mensal && (
                    <>
                      <td className={`${TD} ${G}`} title={`${pctTxt(pesos.faturamento)} Faturamento + ${pctTxt(pesos.ticket)} Ticket + ${pctTxt(pesos.margem)} Margem de peças`}>{pct(l.at)}</td>
                      <td className={TD}>
                        {l.bonus == null ? VAZIO : (
                          <span title={l.motivo || undefined} className={`text-[10px] font-semibold px-1.5 py-px rounded border tabular-nums ${tierChip(l.tier)}`}>{brl(l.bonus)}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ======================================================================================
// Bloco Mecânicos — Produtividade e Eficiência (semana selecionada ou mês)
// Realizado = soma de fato_campanha_diario no período (ROF042: horas aplicadas e vendidas;
// ROF096: horas disponíveis). Produtividade = vendidas ÷ disponíveis; Eficiência = vendidas ÷
// aplicadas. Metas de produtividade e eficiência vêm da aba Regras.
// ======================================================================================
function BlocoMecanicos({ campanha, regras, unidade, periodo, diario, mecanicos, carregandoFunc }) {
  const u = campanha.unidades.find((x) => x.id === unidade)
  const R = regras.funcoes.mecanico
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const eficMax = R.travas.eficienciaMax
  const alvoMes = R.alvo[unidade] || 0
  const pt = pesoTotal(campanha, unidade)
  const nSem = campanha.semanas.length
  const mensal = periodo === 'MES'
  const sem = campanha.semanas.find((s) => s.id === periodo)
  const diasUteis = mensal ? pt : pesoSemana(sem, unidade)

  // Horas por mecânico: no período escolhido e no mês inteiro (a trava de eficiência usa o mês).
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

  const linhas = mecanicos.map((m) => {
    const h = noPeriodo.get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
    const hMes = noMes.get(m.nomeErp) || { aplic: 0, vend: 0, disp: 0 }
    const prod = h.disp ? h.vend / h.disp : null
    const efic = h.aplic ? h.vend / h.aplic : null
    const eficMes = hMes.aplic ? hMes.vend / hMes.aplic : null
    const pProd = metaProd && prod != null ? prod / metaProd : null
    const travaMes = eficMax > 0 && eficMes != null && eficMes >= eficMax
    let tier = null, bonus = null, motivo = null
    if (!mensal && pProd != null) {
      const { faixa: fx, paga } = faixaDaUnidade(pProd, regras, unidade)
      tier = paga
      if (fx && !paga) motivo = `Faixa ${pctTxt(fx.min)} não é paga nesta unidade`
      if (travaMes) { tier = 0; motivo = `Eficiência do mês ${pctTxt(eficMes)} — a partir de ${pctTxt(eficMax)} zera o mês` }
      bonus = alvoMes / (nSem || 1) * tier
    }
    return { m, h, prod, efic, eficMes, pProd, travaMes, tier, bonus, motivo, semHoras: !noMes.has(m.nomeErp) }
  })

  const VAZIO = <span className="text-slate-300">—</span>
  const pct = (v) => (v == null ? VAZIO : <span className={`tabular-nums font-semibold ${corPct(v)}`}>{pctTxt(v)}</span>)
  const horas = (v) => <span className="tabular-nums">{v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  const TD = 'p-2 text-right whitespace-nowrap'
  const G = 'border-l border-slate-200'

  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_FUNCAO.mecanico }} />
          Mecânicos
        </p>
      </div>

      {carregandoFunc || diario === null ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-500">
          Nenhum mecânico "1 - Trabalhando" de {u.nome} nos cargos definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Mecânico.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th rowSpan={2} className="p-2 text-left align-bottom">Mecânico</th>
                <th rowSpan={2} className={`p-2 text-right align-bottom whitespace-nowrap ${G}`}>Dias úteis</th>
                <th colSpan={5} className={`p-1.5 text-center ${G}`}>Produtividade</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Eficiência</th>
                {!mensal && <th colSpan={1} className={`p-1.5 text-center ${G}`}>Resultado da semana</th>}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  ['', 'Meta', true], ['Horas', 'Vendidas'], ['Horas', 'Disponíveis'], ['', 'Realizado', false, 'real'], ['', '%'],
                  ['', 'Meta', true], ['Horas', 'Aplicadas'], ['', 'Realizado', false, 'real'],
                  ...(mensal ? [] : [['', 'Bônus', true]]),
                ].map(([cima, baixo, borda, destaque], i) => (
                  <th key={i} className={`${TH} text-right align-bottom whitespace-nowrap ${borda ? G : ''} ${destaque ? COR_TOTAL[destaque] : ''}`}>
                    {cima && <span className="block text-slate-400">{cima}</span>}
                    <span className="block">{baixo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.m.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium text-slate-800 whitespace-nowrap"
                    title={l.semHoras ? 'Sem horas no ERP no mês (ou nome diferente do cadastro)' : undefined}>
                    {l.m.nome}
                    {l.travaMes && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-px rounded border bg-red-50 text-red-700 border-red-200"
                        title={`Eficiência do mês ${pctTxt(l.eficMes)} — a partir de ${pctTxt(eficMax)} zera o bônus do mês`}>
                        Mês zerado
                      </span>
                    )}
                  </td>
                  <td className={`${TD} ${G} tabular-nums text-slate-600`}>{diasUteis.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaProd ? pctTxt(metaProd) : VAZIO}</td>
                  <td className={TD}>{horas(l.h.vend)}</td>
                  <td className={TD}>{horas(l.h.disp)}</td>
                  <td className={`${TD} font-semibold text-slate-800 ${COR_TOTAL.real}`}>{l.prod == null ? VAZIO : pctTxt(l.prod)}</td>
                  <td className={TD}>{pct(l.pProd)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{eficMax ? `< ${pctTxt(eficMax)}` : VAZIO}</td>
                  <td className={TD}>{horas(l.h.aplic)}</td>
                  <td className={`${TD} ${COR_TOTAL.real} ${l.efic != null && eficMax && l.efic >= eficMax ? 'text-red-600 font-semibold' : ''}`}
                    title={l.efic != null && eficMax && l.efic >= eficMax ? 'Eficiência acima do limite nesta semana (a trava usa o mês)' : undefined}>
                    {l.efic == null ? VAZIO : pctTxt(l.efic)}
                  </td>

                  {!mensal && (
                    <td className={`${TD} ${G}`}>
                      {l.bonus == null ? VAZIO : (
                        <span title={l.motivo || undefined} className={`text-[10px] font-semibold px-1.5 py-px rounded border tabular-nums ${tierChip(l.tier)}`}>{brl(l.bonus)}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ======================================================================================
// Bloco Chefe de Oficina — Produtividade geral + Faturamento de serviços (semana ou mês)
// Produtividade geral = horas vendidas (ou aplicadas, conforme a regra) ÷ disponíveis dos
// mecânicos da campanha; Faturamento de serviços = serviços dos consultores da campanha.
// Meta de produtividade: aba Regras. Meta de serviços: Planejamento de Metas aprovado (Oficina).
// Bônus: valor fixo da faixa (aba Regras) ÷ nº de semanas.
// ======================================================================================
function BlocoChefe({ campanha, regras, unidade, periodo, diario, chefes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const u = campanha.unidades.find((x) => x.id === unidade)
  const R = regras.funcoes.chefe
  const participa = R.participa?.[unidade] !== false
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const pt = pesoTotal(campanha, unidade)
  const nSem = campanha.semanas.length
  const mensal = periodo === 'MES'
  const sem = campanha.semanas.find((s) => s.id === periodo)
  const fr = mensal ? 1 : (pt ? pesoSemana(sem, unidade) / pt : 0)
  const diasUteis = mensal ? pt : pesoSemana(sem, unidade)
  const metaServ = (metasUnidade.unidade.oficina.serv || 0) * fr

  const real = useMemo(() => realizadoDaUnidade(diario, u, mensal, sem, mecanicos, consultores),
    [diario, u, mensal, sem, mecanicos, consultores])

  const horasBase = R.baseProdutividade === 'aplicadas' ? real.aplic : real.vend
  const prod = real.disp ? horasBase / real.disp : null
  const pProd = metaProd && prod != null ? prod / metaProd : null
  const pServ = metaServ ? real.serv / metaServ : null
  let at = null, fx = null, bonus = null, motivo = null
  if (!mensal && pProd != null && pServ != null) {
    at = R.pesos.produtividade * pProd + R.pesos.servicos * pServ
    const r = faixaDaUnidade(at, regras, unidade)
    fx = r.faixa
    bonus = r.paga > 0 && fx ? (R.valores[fx.id] || 0) / (nSem || 1) : 0
    if (fx && !r.paga) motivo = `Faixa ${pctTxt(fx.min)} não é paga nesta unidade`
  }

  const VAZIO = <span className="text-slate-300">—</span>
  const pct = (v) => (v == null ? VAZIO : <span className={`tabular-nums font-semibold ${corPct(v)}`}>{pctTxt(v)}</span>)
  const horas = (v) => <span className="tabular-nums">{v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  const TD = 'p-2 text-right whitespace-nowrap'
  const G = 'border-l border-slate-200'

  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_FUNCAO.chefe }} />
          Chefe de Oficina
        </p>
      </div>

      {!participa ? (
        <p className="px-4 pb-4 text-xs text-slate-500">Esta unidade não tem Chefe de Oficina (ajuste na aba Regras, cartão do Chefe).</p>
      ) : carregandoFunc || diario === null ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : chefes.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-500">
          Nenhum funcionário "1 - Trabalhando" de {u.nome} nos cargos de Chefe definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Chefe.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th rowSpan={2} className="p-2 text-left align-bottom">Chefe de Oficina</th>
                <th rowSpan={2} className={`p-2 text-right align-bottom whitespace-nowrap ${G}`}>Dias úteis</th>
                <th colSpan={5} className={`p-1.5 text-center ${G}`}>Produtividade geral ({pctTxt(R.pesos.produtividade)})</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Faturamento de serviços ({pctTxt(R.pesos.servicos)})</th>
                {!mensal && <th colSpan={2} className={`p-1.5 text-center ${G}`}>Resultado da semana</th>}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  ['', 'Meta', true], ['Horas', R.baseProdutividade === 'aplicadas' ? 'Aplicadas' : 'Vendidas'], ['Horas', 'Disponíveis'], ['', 'Realizado', false, 'real'], ['', '%'],
                  ['', 'Meta', true], ['', 'Realizado', false, 'real'], ['', '%'],
                  ...(mensal ? [] : [['', 'Atingimento', true], ['', 'Bônus']]),
                ].map(([cima, baixo, borda, destaque], i) => (
                  <th key={i} className={`${TH} text-right align-bottom whitespace-nowrap ${borda ? G : ''} ${destaque ? COR_TOTAL[destaque] : ''}`}>
                    {cima && <span className="block text-slate-400">{cima}</span>}
                    <span className="block">{baixo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chefes.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{c.nome}</td>
                  <td className={`${TD} ${G} tabular-nums text-slate-600`}>{diasUteis.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaProd ? pctTxt(metaProd) : VAZIO}</td>
                  <td className={TD}>{horas(horasBase)}</td>
                  <td className={TD}>{horas(real.disp)}</td>
                  <td className={`${TD} font-semibold text-slate-800 ${COR_TOTAL.real}`}>{prod == null ? VAZIO : pctTxt(prod)}</td>
                  <td className={TD}>{pct(pProd)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaServ ? brl(metaServ) : VAZIO}</td>
                  <td className={`${TD} font-semibold text-slate-800 ${COR_TOTAL.real}`}>{brl(real.serv)}</td>
                  <td className={TD}>{pct(pServ)}</td>

                  {!mensal && (
                    <>
                      <td className={`${TD} ${G}`} title={`${pctTxt(R.pesos.produtividade)} Produtividade + ${pctTxt(R.pesos.servicos)} Serviços`}>{pct(at)}</td>
                      <td className={TD}>
                        {bonus == null ? VAZIO : (
                          <span title={motivo || (fx ? `Faixa ${pctTxt(fx.min)}: ${brl(R.valores[fx.id] || 0)} no mês ÷ ${nSem} semanas` : undefined)}
                            className={`text-[10px] font-semibold px-1.5 py-px rounded border tabular-nums ${tierChip(bonus > 0 ? 1 : 0)}`}>{brl(bonus)}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
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

// ======================================================================================
// Bloco Gerente de Pós-Venda (unidade) — Faturamento + Produtividade geral + Margem de peças
// Faturamento e margem = consultores da campanha; produtividade geral = mecânicos da campanha
// (mesma base de horas da regra do Chefe). Meta de faturamento: Planejamento de Metas aprovado
// (Oficina); metas de produtividade e margem: aba Regras.
// ======================================================================================
function BlocoGerente({ campanha, regras, unidade, periodo, diario, gerentes, mecanicos, consultores, metasUnidade, carregandoFunc }) {
  const u = campanha.unidades.find((x) => x.id === unidade)
  const R = regras.funcoes.gerente
  const base = regras.funcoes.chefe.baseProdutividade === 'aplicadas' ? 'aplic' : 'vend'
  const metaProd = R.metaProdutividade?.[unidade] || 0
  const metaMargem = R.metaMargem?.[unidade] || 0
  const alvoMes = R.alvo[unidade] || 0
  const pt = pesoTotal(campanha, unidade)
  const nSem = campanha.semanas.length
  const mensal = periodo === 'MES'
  const sem = campanha.semanas.find((s) => s.id === periodo)
  const fr = mensal ? 1 : (pt ? pesoSemana(sem, unidade) / pt : 0)
  const diasUteis = mensal ? pt : pesoSemana(sem, unidade)
  const metaPecas = (metasUnidade.unidade.oficina.pecas || 0) * fr
  const metaServ = (metasUnidade.unidade.oficina.serv || 0) * fr
  const metaTot = metaPecas + metaServ

  const real = useMemo(() => realizadoDaUnidade(diario, u, mensal, sem, mecanicos, consultores),
    [diario, u, mensal, sem, mecanicos, consultores])
  const realTot = real.serv + real.pecas
  const prod = real.disp ? real[base] / real.disp : null
  const mb = real.pecas ? real.margem / real.pecas : null
  const pFat = metaTot ? realTot / metaTot : null
  const pProd = metaProd && prod != null ? prod / metaProd : null
  const pMb = metaMargem && mb != null ? mb / metaMargem : null
  let at = null, tier = null, bonus = null, motivo = null
  if (!mensal && pFat != null && pProd != null && pMb != null) {
    at = R.pesos.faturamento * pFat + R.pesos.produtividade * pProd + R.pesos.margem * pMb
    const { faixa: fx, paga } = faixaDaUnidade(at, regras, unidade)
    tier = paga
    if (fx && !paga) motivo = `Faixa ${pctTxt(fx.min)} não é paga nesta unidade`
    bonus = alvoMes / (nSem || 1) * tier
  }

  const VAZIO = <span className="text-slate-300">—</span>
  const pct = (v) => (v == null ? VAZIO : <span className={`tabular-nums font-semibold ${corPct(v)}`}>{pctTxt(v)}</span>)
  const TD = 'p-2 text-right whitespace-nowrap'
  const G = 'border-l border-slate-200'

  return (
    <div className={CARD}>
      <div className="p-4 pb-3">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CORES_FUNCAO.gerente }} />
          Gerente de Pós-Venda
        </p>
      </div>

      {carregandoFunc || diario === null ? (
        <p className="px-4 pb-4 text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</p>
      ) : gerentes.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-slate-500">
          Nenhum funcionário "1 - Trabalhando" de {u.nome} nos cargos de Gerente definidos na aba Regras. Confira o cadastro em Funcionários ou os cargos na regra do Gerente.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th rowSpan={2} className="p-2 text-left align-bottom">Gerente</th>
                <th rowSpan={2} className={`p-2 text-right align-bottom whitespace-nowrap ${G}`}>Dias úteis</th>
                <th colSpan={7} className={`p-1.5 text-center ${G}`}>Faturamento ({pctTxt(R.pesos.faturamento)})</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Produtividade geral ({pctTxt(R.pesos.produtividade)})</th>
                <th colSpan={3} className={`p-1.5 text-center ${G}`}>Margem de peças ({pctTxt(R.pesos.margem)})</th>
                {!mensal && <th colSpan={2} className={`p-1.5 text-center ${G}`}>Resultado da semana</th>}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  ['Meta', 'Peças', true], ['Meta', 'Serviços'], ['Meta', 'Total'],
                  ['Realizado', 'Peças', true], ['Realizado', 'Serviços'], ['Realizado', 'Total', false, 'real'], ['', '%', true],
                  ['', 'Meta', true], ['', 'Realizado', false, 'real'], ['', '%'],
                  ['', 'Meta', true], ['', 'Realizado', false, 'real'], ['', '%'],
                  ...(mensal ? [] : [['', 'Atingimento', true], ['', 'Bônus']]),
                ].map(([cima, baixo, borda, destaque], i) => (
                  <th key={i} className={`${TH} text-right align-bottom whitespace-nowrap ${borda ? G : ''} ${destaque ? COR_TOTAL[destaque] : ''}`}>
                    {cima && <span className="block text-slate-400">{cima}</span>}
                    <span className="block">{baixo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gerentes.map((g) => (
                <tr key={g.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{g.nome}</td>
                  <td className={`${TD} ${G} tabular-nums text-slate-600`}>{diasUteis.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaTot ? brl(metaPecas) : VAZIO}</td>
                  <td className={`${TD} text-slate-500`}>{metaTot ? brl(metaServ) : VAZIO}</td>
                  <td className={`${TD} text-slate-700 font-semibold`}>{metaTot ? brl(metaTot) : VAZIO}</td>
                  <td className={`${TD} ${G}`}>{brl(real.pecas)}</td>
                  <td className={TD}>{brl(real.serv)}</td>
                  <td className={`${TD} font-semibold text-slate-800 ${COR_TOTAL.real}`}>{brl(realTot)}</td>
                  <td className={`${TD} ${G}`}>{pct(pFat)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaProd ? pctTxt(metaProd) : VAZIO}</td>
                  <td className={`${TD} ${COR_TOTAL.real}`}
                    title={`Horas ${base === 'aplic' ? 'aplicadas' : 'vendidas'} ${real[base].toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ÷ disponíveis ${real.disp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                    {prod == null ? VAZIO : pctTxt(prod)}
                  </td>
                  <td className={TD}>{pct(pProd)}</td>

                  <td className={`${TD} ${G} text-slate-500`}>{metaMargem ? pctTxt(metaMargem) : VAZIO}</td>
                  <td className={`${TD} ${COR_TOTAL.real}`}>{mb == null ? VAZIO : pctTxt(mb)}</td>
                  <td className={TD}>{pct(pMb)}</td>

                  {!mensal && (
                    <>
                      <td className={`${TD} ${G}`} title={`${pctTxt(R.pesos.faturamento)} Faturamento + ${pctTxt(R.pesos.produtividade)} Produtividade + ${pctTxt(R.pesos.margem)} Margem`}>{pct(at)}</td>
                      <td className={TD}>
                        {bonus == null ? VAZIO : (
                          <span title={motivo || undefined} className={`text-[10px] font-semibold px-1.5 py-px rounded border tabular-nums ${tierChip(tier)}`}>{brl(bonus)}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
// Regras — organizadas na ordem em que a campanha funciona, editáveis e salvas por mês
// ======================================================================================

// Botão ⓘ: abre um quadro curto dizendo do que se trata e como funciona.
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
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label={`Como funciona: ${titulo}`}
        className="h-5 w-5 inline-flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <InfoIcon className="h-4 w-4" />
      </button>
      {aberto && (
        <div role="dialog" aria-label={titulo}
          className="absolute z-30 left-0 top-6 w-80 max-w-[80vw] rounded-lg border border-slate-200 bg-white shadow-lg p-3 space-y-2 text-xs leading-relaxed text-slate-600 font-normal normal-case tracking-normal text-left">
          <p className="text-[13px] font-bold text-slate-800">{titulo}</p>
          {children}
        </div>
      )}
    </span>
  )
}

function Secao({ titulo, info, acao, children }) {
  return (
    <section className={`${CARD} p-4 space-y-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">{titulo} {info}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

const INP = 'text-xs text-right tabular-nums p-1.5 border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
function NumInput({ value, onChange, largura = 'w-28', step = 0.01 }) {
  return (
    <input type="number" step={step} className={`${INP} ${largura}`} value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
  )
}
// Valor em dinheiro: mostra R$ 1.500,00; ao clicar, edita como 1500,00 (vírgula ou ponto aceitos).
const moedaTxt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const lerMoeda = (txt) => {
  const limpo = String(txt).replace(/[^\d,.-]/g, '')
  const n = limpo.includes(',') ? parseFloat(limpo.replace(/\./g, '').replace(',', '.')) : parseFloat(limpo)
  return isNaN(n) ? 0 : n
}
function MoedaInput({ value, onChange, largura = 'w-32' }) {
  const [texto, setTexto] = useState(null) // null = fora de edição (mostra formatado)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-slate-400 text-xs">R$</span>
      <input type="text" inputMode="decimal" className={`${INP} ${largura}`}
        value={texto ?? moedaTxt(value)}
        onFocus={(e) => { setTexto(moedaTxt(value)); e.target.select() }}
        onChange={(e) => { setTexto(e.target.value); onChange(lerMoeda(e.target.value)) }}
        onBlur={() => setTexto(null)} />
    </span>
  )
}
// Mostra/edita em % (50,00) e guarda em fração (0.5).
function PctInput({ value, onChange, largura = 'w-20' }) {
  const shown = value == null ? '' : Math.round(value * 10000) / 100
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" step={0.01} className={`${INP} ${largura}`} value={shown}
        onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value) / 100)} />
      <span className="text-slate-400">%</span>
    </span>
  )
}

const ROTULO_FAIXA = { f80: '80%', f90: '90%', f100: '100%', f110: '110%' }
const somaPesos = (pesos) => Object.values(pesos || {}).reduce((s, v) => s + (Number(v) || 0), 0)
const pesosOk = (pesos) => Math.abs(somaPesos(pesos) - 1) < 0.0001

// Pesos editáveis de uma função, com a soma (precisa dar 100%).
function Pesos({ itens, pesos, onChange }) {
  const ok = pesosOk(pesos)
  return (
    <div className="space-y-1.5">
      {itens.map(([k, rotulo]) => (
        <div key={k} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">{rotulo}</span>
          <PctInput value={pesos[k]} onChange={(v) => onChange(k, v)} />
        </div>
      ))}
      <p className={`text-[11px] font-semibold text-right ${ok ? 'text-emerald-700' : 'text-red-600'}`}>
        Soma {pctTxt(somaPesos(pesos))}{ok ? '' : ' — precisa dar 100%'}
      </p>
    </div>
  )
}

function Linha({ rotulo, children }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-600">{rotulo}</span>
      <span className="shrink-0">{children}</span>
    </div>
  )
}

function CartaoFuncao({ cor, nome, participa, info, children }) {
  return (
    <div className={`${CARD} p-4 flex flex-col gap-3 ${participa ? '' : 'opacity-70'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} /> {nome} {info}
        </p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${participa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {participa ? 'Participa nesta unidade' : 'Não participa nesta unidade'}
        </span>
      </div>
      {children}
    </div>
  )
}
const Subtitulo = ({ children }) => <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{children}</p>

function AbaRegras({ campanha, semCalendario, ano, mes, nomeMes, unidade, consultores, metasUnidade, carregandoMetas,
  regras, alterar, cargosMecanico, cargosChefe, cargosGerente, origemRegras, alterado, salvando, msgRegras, onSalvar, onRestaurarPadrao }) {
  const u0 = campanha.unidades.find((u) => u.id === unidade)
  const nSem = campanha.semanas.length
  const diasFmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const F = regras.funcoes
  const { consultores: metasCons, unidade: metasUni } = metasUnidade
  const faixasOrdenadas = [...regras.faixas].sort((a, b) => a.min - b.min)
  const alvoConsultor = F.consultor.alvo[unidade] || 0

  // Campo de bônus-alvo (R$ no mês) da unidade selecionada, com o valor por semana ao lado.
  const alvo = (funcao) => (
    <Linha rotulo="Bônus-alvo no mês (esta unidade)">
      <span className="inline-flex items-center gap-2">
        <MoedaInput value={F[funcao].alvo[unidade] ?? 0} onChange={(v) => alterar(['funcoes', funcao, 'alvo', unidade], v)} />
        <span className="text-[11px] text-slate-400 tabular-nums">= {brl((F[funcao].alvo[unidade] || 0) / (nSem || 1))}/sem</span>
      </span>
    </Linha>
  )
  // Valores fixos por faixa (Chefe de Oficina, Gerente Geral).
  const valoresFaixa = (caminho, valores) => (
    <div className="space-y-1.5">
      {FAIXAS_IDS.map((fid) => (
        <Linha key={fid} rotulo={`Faixa ${ROTULO_FAIXA[fid]}`}>
          <span className="inline-flex items-center gap-2">
            <MoedaInput value={valores[fid] ?? 0} onChange={(v) => alterar([...caminho, fid], v)} />
            <span className="text-[11px] text-slate-400 tabular-nums">= {brl((valores[fid] || 0) / (nSem || 1))}/sem</span>
          </span>
        </Linha>
      ))}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Origem das regras + salvar */}
      <div className={`${CARD} p-3 flex items-center justify-between gap-3 flex-wrap`}>
        <p className="text-xs text-slate-600">
          <b className="text-slate-800">Regras de {nomeMes}/{ano}:</b> {origemRegras}
        </p>
        <div className="flex items-center gap-2">
          {msgRegras && <span className={`text-xs ${msgRegras.erro ? 'text-red-600' : 'text-emerald-700'}`}>{msgRegras.txt}</span>}
          <button onClick={onRestaurarPadrao}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">
            Voltar ao padrão do regulamento
          </button>
          <button onClick={onSalvar} disabled={salvando || !alterado}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar regras de {nomeMes}/{ano}
          </button>
        </div>
      </div>

      {/* 1. Visão geral */}
      <Secao titulo="Como a campanha funciona" info={(
        <Info titulo="Como a campanha funciona">
          <p>O bônus é calculado <b>semana a semana</b>. Em cada semana o colaborador é comparado com a meta daquela semana e recebe uma parte do bônus conforme a faixa que atingiu.</p>
          <p>No fim do mês somam-se as semanas pagas. Esse total é pago no mês seguinte. Semana perdida não é recuperada depois.</p>
          <p>O resultado do mês inteiro só serve para as <b>travas</b> (retorno, atrasos, eficiência, índice de retorno), que podem cancelar o mês.</p>
        </Info>
      )}>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
          {[
            ['Meta da semana', 'Meta do mês aprovada no Planejamento de Metas, dividida pelos dias úteis de cada semana.'],
            ['Realizado', 'Números do ERP (notas emitidas e OS), atualizados pela sincronização.'],
            ['Atingimento', 'Realizado ÷ meta de cada indicador, somado pelos pesos da função.'],
            ['Faixa', 'O atingimento define quanto do bônus da semana é pago (50%, 75%, 100% ou 120%).'],
            ['Bônus da semana', `Bônus-alvo do mês ÷ ${nSem || 'nº de'} semanas × % da faixa.`],
            ['Travas', 'Ocorrências do mês podem zerar o mês inteiro ou reduzir uma semana.'],
          ].map(([t, txt], i) => (
            <li key={t} className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] font-bold text-blue-700">{i + 1}. {t}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{txt}</p>
            </li>
          ))}
        </ol>
      </Secao>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 2. Calendário */}
        <Secao titulo="Semanas do mês" info={(
          <Info titulo="Semanas do mês">
            <p><b>O que é:</b> as semanas em que o resultado é apurado e pago.</p>
            <p><b>Como funciona:</b> cada semana vai de segunda a domingo. Uma semana na ponta do mês com poucos dias (menos que o número definido abaixo, contando só segunda a sexta) é juntada à semana vizinha.</p>
            <p>Os dias úteis vêm do menu <b>Calendário</b> da empresa: sábado vale 0,5 e feriado vale 0. A meta de cada semana é proporcional a esses dias. Todas as semanas valem a mesma parte do bônus.</p>
          </Info>
        )}>
          {semCalendario.includes(unidade) && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Calendário de {ano} não gerado para {u0.nome} — usando seg–sex = 1 e sábado = 0,5 até ser gerado.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className={`${TH} text-left`}>Semana</th>
                  <th className={`${TH} text-left`}>Período</th>
                  <th className={`${TH} text-right`}>Dias úteis</th>
                  <th className={`${TH} text-right`}>% da meta do mês</th>
                  <th className={`${TH} text-right`}>% do bônus</th>
                </tr>
              </thead>
              <tbody>
                {campanha.semanas.map((s) => {
                  const pt = pesoTotal(campanha, unidade)
                  return (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="p-2 font-semibold text-slate-700 whitespace-nowrap">Sem {s.id.slice(1)}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{s.label}</td>
                      <td className="p-2 text-right tabular-nums">{diasFmt(pesoSemana(s, unidade))}</td>
                      <td className="p-2 text-right tabular-nums">{pt ? pctTxt(pesoSemana(s, unidade) / pt) : '—'}</td>
                      <td className="p-2 text-right tabular-nums">{pctTxt(1 / (nSem || 1))}</td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-2 text-slate-900" colSpan={2}>Total do mês</td>
                  <td className="p-2 text-right tabular-nums">{diasFmt(pesoTotal(campanha, unidade))}</td>
                  <td className="p-2 text-right tabular-nums">100,00%</td>
                  <td className="p-2 text-right tabular-nums">100,00%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Linha rotulo="Juntar semana da ponta do mês com menos de (dias de seg a sex)">
            <NumInput largura="w-16" step={1} value={regras.semanaMinSegSex} onChange={(v) => alterar(['semanaMinSegSex'], Math.max(0, Math.round(v)))} />
          </Linha>
        </Secao>

        {/* 3. Faixas */}
        <Secao titulo="Faixas de pagamento" info={(
          <Info titulo="Faixas de pagamento">
            <p><b>O que é:</b> quanto do bônus da semana é pago conforme o atingimento.</p>
            <p><b>Como funciona:</b> vale a maior faixa alcançada. Ex.: 92% de atingimento cai na faixa de 90% e paga 75% do bônus da semana.</p>
            <p>A coluna <b>Paga nesta unidade</b> define se a faixa paga na empresa selecionada. Pelo regulamento, Dourados, Três Lagoas e Chapadão só pagam a partir de 100%; nessas unidades uma semana com 92% não paga nada.</p>
            <p>A faixa de 110% ou mais é a <b>supermeta</b> e paga 120% do bônus da semana.</p>
          </Info>
        )}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className={`${TH} text-left`}>Atingimento a partir de</th>
                  <th className={`${TH} text-left`}>Paga do bônus da semana</th>
                  <th className={`${TH} text-center`}>Paga nesta unidade</th>
                  <th className={`${TH} text-right`}>Ex.: Consultor/semana</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-2 text-slate-600">abaixo da 1ª faixa</td>
                  <td className="p-2 text-slate-600">0%</td>
                  <td className="p-2 text-center text-slate-300">—</td>
                  <td className="p-2 text-right tabular-nums text-slate-400">{brl(0)}</td>
                </tr>
                {faixasOrdenadas.map((f) => {
                  const idx = regras.faixas.findIndex((x) => x.id === f.id)
                  const paga = regras.faixasPorUnidade?.[unidade]?.[f.id] !== false
                  return (
                    <tr key={f.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-2"><PctInput value={f.min} onChange={(v) => alterar(['faixas', idx, 'min'], v)} /></td>
                      <td className="p-2"><PctInput value={f.paga} onChange={(v) => alterar(['faixas', idx, 'paga'], v)} /></td>
                      <td className="p-2 text-center">
                        <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={paga}
                          onChange={(e) => alterar(['faixasPorUnidade', unidade, f.id], e.target.checked)}
                          aria-label={`Faixa ${ROTULO_FAIXA[f.id]} paga em ${u0.nome}`} />
                      </td>
                      <td className="p-2 text-right tabular-nums text-slate-600">{brl(paga ? alvoConsultor / (nSem || 1) * f.paga : 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      </div>

      {/* 4. Metas aprovadas */}
      <Secao titulo="Metas do mês — Planejamento de Metas aprovado" info={(
        <Info titulo="Metas do mês">
          <p><b>O que é:</b> as metas usadas na campanha. Vêm prontas da Gestão de Aprovação de Metas; não são digitadas aqui.</p>
          <p><b>Como funciona:</b> o consultor é aprovado com uma meta total. A separação entre peças e serviços segue a proporção da meta dos mecânicos do mesmo setor. Ticket médio e margem de peças são os aprovados no planejamento de cada consultor.</p>
          <p>Para mudar uma meta, altere e aprove no Planejamento de Metas.</p>
        </Info>
      )} acao={metasUnidade.aprovadoEm && (
        <span className="text-[11px] text-slate-400">Aprovado em {dataHora(metasUnidade.aprovadoEm)}{metasUnidade.aprovadoPor ? ` por ${metasUnidade.aprovadoPor}` : ''}</span>
      )}>
        {carregandoMetas ? (
          <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando metas…</p>
        ) : !metasCons.length && !metasUni.gg.fat ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Nenhuma meta aprovada para esta empresa no mês. Aprove as metas na Gestão de Aprovação de Metas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className={`${TH} text-left`}>Consultor</th>
                  <th className={`${TH} text-left`}>Setor</th>
                  <th className={`${TH} text-right`}>% da meta</th>
                  <th className={`${TH} text-right`}>Meta peças</th>
                  <th className={`${TH} text-right`}>Meta serviços</th>
                  <th className={`${TH} text-right`}>Meta total</th>
                  <th className={`${TH} text-right`}>Ticket médio</th>
                  <th className={`${TH} text-right`}>Margem de peças</th>
                </tr>
              </thead>
              <tbody>
                {metasCons.map((m) => (
                  <tr key={m.nomeNorm} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-700 whitespace-nowrap">{nomeProprio(m.nome)}</td>
                    <td className="p-2 text-slate-500 whitespace-nowrap">{m.setor || '—'}</td>
                    <td className="p-2 text-right tabular-nums">{m.percentual != null ? pctTxt(m.percentual) : '—'}</td>
                    <td className="p-2 text-right tabular-nums">{brl(m.pecas)}</td>
                    <td className="p-2 text-right tabular-nums">{brl(m.serv)}</td>
                    <td className="p-2 text-right tabular-nums font-semibold">{brl(m.fat)}</td>
                    <td className="p-2 text-right tabular-nums">{m.ticket != null ? brl(m.ticket) : '—'}</td>
                    <td className="p-2 text-right tabular-nums">{m.mb != null ? pctTxt(m.mb) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-2 text-slate-900" colSpan={3}>Oficina (mecânicos, sem Funilaria)</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.oficina.pecas)}</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.oficina.serv)}</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.oficina.fat)}</td>
                  <td /><td />
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td className="p-2 text-slate-900" colSpan={3}>Gerente Geral (total da unidade)</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.gg.pecas)}</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.gg.serv)}</td>
                  <td className="p-2 text-right tabular-nums">{brl(metasUni.gg.fat)}</td>
                  <td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {/* 5. Regras por função */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          Regras por função
          <Info titulo="Regras por função">
            <p>Cada função tem sua forma de calcular o atingimento (pesos), o bônus-alvo do mês e suas travas.</p>
            <p>Os valores de bônus mostrados são os da <b>empresa selecionada</b> no topo. Para uma função não participar da unidade, deixe o bônus-alvo em 0.</p>
          </Info>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <CartaoFuncao cor={CORES_FUNCAO.consultor} nome="Consultor Técnico" participa={alvoConsultor > 0} info={(
            <Info titulo="Consultor Técnico">
              <p><b>Quem participa:</b> funcionários ativos com cargo no agrupamento "{CAMPANHA.funcoes.consultor.agrupamentoCargo}" e departamento {CAMPANHA.funcoes.consultor.departamento}.</p>
              <p><b>Faturamento:</b> peças + serviços das OS do consultor (NF emitida). <b>Ticket médio:</b> faturamento ÷ nº de OS da semana. <b>Margem de peças:</b> lucro das peças ÷ valor das peças.</p>
              <p><b>Atingimento:</b> cada indicador vira um % da sua meta e eles são somados pelos pesos. Ex.: 50% × 90% + 10% × 110% + 40% × 100% = 96%.</p>
              <p><b>Margem mínima:</b> se a margem de peças da semana ficar abaixo do mínimo, a semana não paga, mesmo com atingimento alto.</p>
            </Info>
          )}>
            <Subtitulo>Atingimento</Subtitulo>
            <Pesos pesos={F.consultor.pesos} onChange={(k, v) => alterar(['funcoes', 'consultor', 'pesos', k], v)}
              itens={[['faturamento', 'Faturamento (peças + serviços)'], ['ticket', 'Ticket médio'], ['margem', 'Margem de peças']]} />
            <Subtitulo>Bônus</Subtitulo>
            {alvo('consultor')}
            <Subtitulo>Requisito da semana</Subtitulo>
            <Linha rotulo="Margem de peças mínima (0 = sem mínimo)">
              <PctInput value={F.consultor.margemMinimaPecas} onChange={(v) => alterar(['funcoes', 'consultor', 'margemMinimaPecas'], v)} />
            </Linha>
          </CartaoFuncao>

          <CartaoFuncao cor={CORES_FUNCAO.mecanico} nome="Mecânico" participa={(F.mecanico.alvo[unidade] || 0) > 0} info={(
            <Info titulo="Mecânico">
              <p><b>Quem participa:</b> funcionários ativos do agrupamento "{CAMPANHA.funcoes.mecanico.agrupamentoCargo}", departamento {CAMPANHA.funcoes.mecanico.departamento}, nos cargos marcados abaixo.</p>
              <p><b>Produtividade:</b> horas vendidas ÷ horas disponíveis da semana. O atingimento é a produtividade ÷ meta. Ex.: 48% com meta de 60% = 80% de atingimento.</p>
              <p><b>Eficiência:</b> horas vendidas ÷ horas aplicadas. Precisa ficar abaixo do limite; se a eficiência do mês chegar ao limite, o mês é zerado.</p>
              <p><b>Travas do mês:</b> qualquer uma das ocorrências abaixo zera o bônus do mês inteiro, mesmo com semanas batidas.</p>
            </Info>
          )}>
            <Subtitulo>Metas (esta unidade)</Subtitulo>
            <Linha rotulo="Meta de produtividade (vendidas ÷ disponíveis)">
              <PctInput value={F.mecanico.metaProdutividade?.[unidade] ?? 0} onChange={(v) => alterar(['funcoes', 'mecanico', 'metaProdutividade', unidade], v)} />
            </Linha>
            <Linha rotulo="Eficiência precisa ficar abaixo de">
              <PctInput value={F.mecanico.travas.eficienciaMax} onChange={(v) => alterar(['funcoes', 'mecanico', 'travas', 'eficienciaMax'], v)} />
            </Linha>
            <Subtitulo>Atingimento</Subtitulo>
            <p className="text-xs text-slate-600">100% produtividade ÷ meta de produtividade</p>
            <Subtitulo>Bônus</Subtitulo>
            {alvo('mecanico')}
            <Subtitulo>Zera o mês com</Subtitulo>
            <Linha rotulo="Retornos procedentes no mês (a partir de)"><NumInput largura="w-16" step={1} value={F.mecanico.travas.retornos} onChange={(v) => alterar(['funcoes', 'mecanico', 'travas', 'retornos'], v)} /></Linha>
            <Linha rotulo="Atrasos injustificados no mês (a partir de)"><NumInput largura="w-16" step={1} value={F.mecanico.travas.atrasos} onChange={(v) => alterar(['funcoes', 'mecanico', 'travas', 'atrasos'], v)} /></Linha>
            <p className="text-[11px] text-slate-500">Eficiência do mês igual ou acima do limite também zera o mês.</p>
            <Subtitulo>Cargos que participam</Subtitulo>
            {cargosMecanico.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum cargo encontrado no agrupamento nesta unidade.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {cargosMecanico.map((cargo) => {
                  const marcado = cargoEhMecanico(cargo, F.mecanico.cargos)
                  const alternar = () => {
                    const atuais = Array.isArray(F.mecanico.cargos) ? F.mecanico.cargos : cargosMecanico.filter((c) => cargoEhMecanico(c, null))
                    alterar(['funcoes', 'mecanico', 'cargos'], marcado ? atuais.filter((c) => c !== cargo) : [...atuais, cargo])
                  }
                  return (
                    <label key={cargo} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={marcado} onChange={alternar} />
                      {nomeProprio(cargo)}
                    </label>
                  )
                })}
              </div>
            )}
          </CartaoFuncao>

          <CartaoFuncao cor={CORES_FUNCAO.box} nome="Mecânico Box Express" participa={(F.box.alvo[unidade] || 0) > 0} info={(
            <Info titulo="Mecânico Box Express">
              <p><b>Como funciona:</b> bônus fixo, sem medir produtividade. Cada semana paga o bônus-alvo ÷ nº de semanas. Não tem supermeta.</p>
              <p>Pelo regulamento, só existe em Campo Grande.</p>
            </Info>
          )}>
            <Subtitulo>Bônus (valor fixo)</Subtitulo>
            {alvo('box')}
            <Subtitulo>Zera o mês com</Subtitulo>
            <Linha rotulo="Retornos procedentes no mês (a partir de)"><NumInput largura="w-16" step={1} value={F.box.travas.retornos} onChange={(v) => alterar(['funcoes', 'box', 'travas', 'retornos'], v)} /></Linha>
            <Linha rotulo="Atrasos injustificados no mês (a partir de)"><NumInput largura="w-16" step={1} value={F.box.travas.atrasos} onChange={(v) => alterar(['funcoes', 'box', 'travas', 'atrasos'], v)} /></Linha>
          </CartaoFuncao>

          <CartaoFuncao cor={CORES_FUNCAO.chefe} nome="Chefe de Oficina" participa={F.chefe.participa[unidade] !== false} info={(
            <Info titulo="Chefe de Oficina">
              <p><b>Quem participa:</b> funcionários ativos do agrupamento "{CAMPANHA.funcoes.chefe.agrupamentoCargo}" nos cargos marcados para a unidade.</p>
              <p><b>Produtividade geral:</b> horas vendidas (ou aplicadas) ÷ horas disponíveis de todos os mecânicos da campanha na unidade, comparada com a meta abaixo.</p>
              <p><b>Faturamento de serviços:</b> serviços dos consultores da campanha, comparado com a meta de serviços da Oficina aprovada no Planejamento de Metas.</p>
              <p><b>Bônus:</b> em vez de um % do bônus-alvo, cada faixa tem um valor fixo no mês. A semana paga o valor da faixa ÷ nº de semanas. A faixa só paga se estiver marcada como paga nesta unidade.</p>
              <p>Não tem a trava de retorno individual; tem a trava de índice de retorno da unidade.</p>
            </Info>
          )}>
            <Linha rotulo="Esta unidade tem Chefe de Oficina">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={F.chefe.participa[unidade] !== false}
                onChange={(e) => alterar(['funcoes', 'chefe', 'participa', unidade], e.target.checked)} />
            </Linha>
            <Subtitulo>Metas (esta unidade)</Subtitulo>
            <Linha rotulo="Meta de produtividade geral">
              <PctInput value={F.chefe.metaProdutividade?.[unidade] ?? 0} onChange={(v) => alterar(['funcoes', 'chefe', 'metaProdutividade', unidade], v)} />
            </Linha>
            <Linha rotulo="Produtividade calculada com horas">
              <select className={`${INP} w-32 text-left`} value={F.chefe.baseProdutividade || 'vendidas'}
                onChange={(e) => alterar(['funcoes', 'chefe', 'baseProdutividade'], e.target.value)}>
                <option value="vendidas">vendidas ÷ disponíveis</option>
                <option value="aplicadas">aplicadas ÷ disponíveis</option>
              </select>
            </Linha>
            <Linha rotulo="Meta de serviços no mês (planejamento aprovado)">
              <span className="text-xs font-semibold tabular-nums text-slate-700">{brl(metasUni.oficina.serv)}</span>
            </Linha>
            <Subtitulo>Cargos que fazem o papel de Chefe nesta unidade</Subtitulo>
            {cargosChefe.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum cargo encontrado no agrupamento nesta unidade.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {cargosChefe.map((cargo) => {
                  const atuais = F.chefe.cargos?.[unidade] || []
                  const marcado = atuais.includes(cargo)
                  return (
                    <label key={cargo} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={marcado}
                        onChange={() => alterar(['funcoes', 'chefe', 'cargos', unidade], marcado ? atuais.filter((c) => c !== cargo) : [...atuais, cargo])} />
                      {nomeProprio(cargo)}
                    </label>
                  )
                })}
              </div>
            )}
            <Subtitulo>Atingimento</Subtitulo>
            <Pesos pesos={F.chefe.pesos} onChange={(k, v) => alterar(['funcoes', 'chefe', 'pesos', k], v)}
              itens={[['produtividade', 'Produtividade geral'], ['servicos', 'Faturamento de serviços']]} />
            <Subtitulo>Valor do bônus no mês, por faixa</Subtitulo>
            {valoresFaixa(['funcoes', 'chefe', 'valores'], F.chefe.valores)}
          </CartaoFuncao>

          <CartaoFuncao cor={CORES_FUNCAO.prog} nome="Programação / Apontamento" participa={(F.prog.alvo[unidade] || 0) > 0} info={(
            <Info titulo="Programação / Apontamento">
              <p><b>Atingimento:</b> conformidade de apontamento e suporte à produtividade (produtividade geral), somados pelos pesos.</p>
              <p><b>Conformidade mínima:</b> abaixo dela a semana não paga.</p>
              <p><b>Falhas críticas na semana:</b> a partir do 1º número a supermeta fica bloqueada; a partir do 2º a faixa desce um nível; a partir do 3º a semana é zerada.</p>
            </Info>
          )}>
            <Subtitulo>Atingimento</Subtitulo>
            <Pesos pesos={F.prog.pesos} onChange={(k, v) => alterar(['funcoes', 'prog', 'pesos', k], v)}
              itens={[['conformidade', 'Conformidade de apontamento'], ['produtividade', 'Suporte à produtividade']]} />
            <Linha rotulo="Conformidade mínima"><PctInput value={F.prog.conformidadeMinima} onChange={(v) => alterar(['funcoes', 'prog', 'conformidadeMinima'], v)} /></Linha>
            <Subtitulo>Bônus</Subtitulo>
            {alvo('prog')}
            <Subtitulo>Falhas críticas na semana</Subtitulo>
            <Linha rotulo="Bloqueia a supermeta a partir de"><NumInput largura="w-16" step={1} value={F.prog.falhas.bloqueiaSupermeta} onChange={(v) => alterar(['funcoes', 'prog', 'falhas', 'bloqueiaSupermeta'], v)} /></Linha>
            <Linha rotulo="Desce uma faixa a partir de"><NumInput largura="w-16" step={1} value={F.prog.falhas.desceFaixa} onChange={(v) => alterar(['funcoes', 'prog', 'falhas', 'desceFaixa'], v)} /></Linha>
            <Linha rotulo="Zera a semana a partir de"><NumInput largura="w-16" step={1} value={F.prog.falhas.zeraSemana} onChange={(v) => alterar(['funcoes', 'prog', 'falhas', 'zeraSemana'], v)} /></Linha>
          </CartaoFuncao>

          <CartaoFuncao cor={CORES_FUNCAO.gerente} nome="Gerente de Pós-Venda (unidade)" participa={(F.gerente.alvo[unidade] || 0) > 0} info={(
            <Info titulo="Gerente de Pós-Venda">
              <p><b>Quem participa:</b> funcionários ativos dos agrupamentos "Gerentes" ou "Gerente Geral" nos cargos marcados para a unidade.</p>
              <p><b>Faturamento:</b> peças + serviços dos consultores da campanha, contra a meta da Oficina aprovada no Planejamento de Metas.</p>
              <p><b>Produtividade geral:</b> a mesma do Chefe de Oficina (mecânicos da campanha, mesma base de horas), contra a meta abaixo.</p>
              <p><b>Margem de peças:</b> lucro das peças ÷ valor das peças dos consultores da campanha, contra a meta abaixo.</p>
              <p>Tem a trava de índice de retorno da unidade.</p>
            </Info>
          )}>
            <Subtitulo>Metas (esta unidade)</Subtitulo>
            <Linha rotulo="Meta de produtividade geral">
              <PctInput value={F.gerente.metaProdutividade?.[unidade] ?? 0} onChange={(v) => alterar(['funcoes', 'gerente', 'metaProdutividade', unidade], v)} />
            </Linha>
            <Linha rotulo="Meta de margem de peças">
              <PctInput value={F.gerente.metaMargem?.[unidade] ?? 0} onChange={(v) => alterar(['funcoes', 'gerente', 'metaMargem', unidade], v)} />
            </Linha>
            <Linha rotulo="Meta de faturamento no mês (planejamento aprovado)">
              <span className="text-xs font-semibold tabular-nums text-slate-700">{brl(metasUni.oficina.fat)}</span>
            </Linha>
            <Subtitulo>Cargos que fazem o papel de Gerente nesta unidade</Subtitulo>
            {cargosGerente.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum cargo encontrado nos agrupamentos nesta unidade.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {cargosGerente.map((cargo) => {
                  const atuais = F.gerente.cargos?.[unidade] || []
                  const marcado = atuais.includes(cargo)
                  return (
                    <label key={cargo} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={marcado}
                        onChange={() => alterar(['funcoes', 'gerente', 'cargos', unidade], marcado ? atuais.filter((c) => c !== cargo) : [...atuais, cargo])} />
                      {nomeProprio(cargo)}
                    </label>
                  )
                })}
              </div>
            )}
            <Subtitulo>Atingimento</Subtitulo>
            <Pesos pesos={F.gerente.pesos} onChange={(k, v) => alterar(['funcoes', 'gerente', 'pesos', k], v)}
              itens={[['faturamento', 'Faturamento total'], ['produtividade', 'Produtividade geral'], ['margem', 'Margem bruta consolidada']]} />
            <Subtitulo>Bônus</Subtitulo>
            {alvo('gerente')}
          </CartaoFuncao>

          <CartaoFuncao cor="#475569" nome="Gerente Geral de Pós-Venda" participa info={(
            <Info titulo="Gerente Geral de Pós-Venda">
              <p><b>Atingimento:</b> 100% o faturamento total de cada unidade, calculado separadamente por unidade.</p>
              <p><b>Bônus:</b> valor fixo por faixa em cada unidade; a semana paga o valor da faixa ÷ nº de semanas. Os valores abaixo são os da unidade selecionada.</p>
            </Info>
          )}>
            <Subtitulo>Atingimento</Subtitulo>
            <p className="text-xs text-slate-600">100% faturamento total da unidade</p>
            <Subtitulo>Valor do bônus no mês, por faixa (esta unidade)</Subtitulo>
            {valoresFaixa(['funcoes', 'gerenteGeral', 'valores', unidade], F.gerenteGeral.valores[unidade] || {})}
          </CartaoFuncao>

          <CartaoFuncao cor="#dc2626" nome="Trava de índice de retorno (gestão)" participa info={(
            <Info titulo="Trava de índice de retorno">
              <p><b>O que é:</b> o valor dos retornos (retrabalho) da unidade no mês comparado com o faturamento total.</p>
              <p><b>Como funciona:</b> se passar do limite, o bônus do mês do Chefe de Oficina e do Gerente de Pós-Venda é cancelado.</p>
            </Info>
          )}>
            <Linha rotulo="Cancela o mês acima de (% do faturamento)">
              <PctInput value={regras.indiceRetornoMax} onChange={(v) => alterar(['indiceRetornoMax'], v)} />
            </Linha>
            <p className="text-[11px] text-slate-500">Vale para Chefe de Oficina e Gerente de Pós-Venda.</p>
          </CartaoFuncao>
        </div>
      </div>

      {/* 6. Pontos a confirmar */}
        <Secao titulo="Pontos do regulamento a confirmar" info={(
          <Info titulo="Pontos a confirmar">
            <p>Trechos em que o regulamento não é claro. Mostra a leitura que o sistema está usando e onde ajustar se a Gerência decidir diferente.</p>
          </Info>
        )}>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
            {PONTOS_A_CONFIRMAR.map(([t, txt]) => <li key={t}><b className="text-slate-800">{t}:</b> {txt}</li>)}
          </ol>
        </Secao>
    </div>
  )
}
