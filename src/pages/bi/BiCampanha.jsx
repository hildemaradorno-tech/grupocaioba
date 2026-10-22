import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Calculator, BookOpen, BarChart2, Loader2, RefreshCw, Info as InfoIcon, Lock, Unlock, Plus, Trash2, Eraser, Copy, CopyPlus, Settings, FileText, X, ChevronDown, Banknote, Save, Users, Pencil } from 'lucide-react'
import { Bloco3ServicosVisualizacao } from '../kpi/KpiBloco3Servicos'
import { createPortal } from 'react-dom'
import { apiService } from '../../services/api'
import { fetchBloco3Servicos, fetchBloco3Pecas, fetchBloco3PosVenda } from '../../services/kpiService'
import { useSincronizacaoKpi } from '../../hooks/useSincronizacaoKpi'
import { useAuth } from '../../context/AuthContext'
import {
  CAMPANHA, REGRAS_PADRAO, faixasDe, trimestreDoMes, atingimentoBlocoMatriz, montarSemanas, pesoSemana, pesoTotal, pctTxt,
  mesclarRegras, metasAprovadasDaUnidade, semanasMatrizDoMes, contribSemanaMatriz,
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

// Consultores da unidade = funcionários "1 - Trabalhando" ou "9 - Férias" no menu Funcionários, da empresa, cargo no agrupamento e departamento
// definidos na regra da função (menu Funcionários).
function consultoresDaUnidade(funcionarios, u) {
  const { agrupamentoCargo, departamento } = CAMPANHA.funcoes.consultor
  return (funcionarios || [])
    .filter((f) => f.empresa_id === u.empresaId && f.agrupamento === agrupamentoCargo
      && (!departamento || f.departamentos.some((d) => normNome(d) === normNome(departamento))))
    .map((f) => ({ id: f.id, nome: nomeProprio(f.nome_funcionario), nomeErp: normNome(f.nome_funcionario), codigo: f.codigo_sistema_bi ? String(f.codigo_sistema_bi).trim() : null }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
// Participa quem está com Situação do Funcionário = "1 - Trabalhando" ou "9 - Férias" no menu Funcionários
// (e sem data de demissão) — quem está de férias continua na campanha. Outros afastamentos (doença,
// licença…), demitidos e cadastros sem situação ficam fora.
const SITUACOES_PARTICIPAM = new Set(['1', '9'])
const trabalhando = (f) => SITUACOES_PARTICIPAM.has(String(f.situacao_funcionario ?? '').trim()) && !f.data_demissao

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

// ── Permissões (Configurações › Grupos de Acessos / Matriz de Permissões) ────────────────────────
// Abas e empresas são itens de menu (marcar = pode ver); botões são ações da aba (acoesMenu.js).
export const CAMPANHA_ABAS = [
  { k: 'regras', label: 'Regras', icon: BookOpen, perm: 'bi/campanha/regras' },
  { k: 'apuracao', label: 'Apuração', icon: Calculator, perm: 'bi/campanha/apuracao' },
  { k: 'resultado', label: 'Resultado', icon: BarChart2, perm: 'bi/campanha/resultado' },
  { k: 'pagamento', label: 'Pagamento', icon: Banknote, perm: 'bi/campanha/pagamento' },
]
export const CAMPANHA_ABAS_PERMS = CAMPANHA_ABAS.map((a) => a.perm)
const PERM_EMPRESA = { TRUCKS: 'bi/campanha/empresa-trucks', CG: 'bi/campanha/empresa-cg', DOU: 'bi/campanha/empresa-dou', TL: 'bi/campanha/empresa-tl', CS: 'bi/campanha/empresa-cs' }

// ── Participantes por cargo (Bônus-alvo - Serviços) ──────────────────────────────────────────────
// Cada linha do Bônus-alvo define QUEM aparece na Apuração/Resultado/Pagamento: as pessoas da
// empresa cujos cargos estão agrupados na linha (aba Regras › "Cargos"). Linhas fixas guardam a lista
// em regras.cargosLinha[unidade][linha]; sem lista salva, vale a regra antiga de cada função.
// Grupos criados pelo usuário ("Adicionar cargo") ficam em regras.gruposBonus[unidade][k] =
// { nome, cargos, meta, supermeta }. Ainda NÃO entram na Apuração/Resultado/Pagamento: o valor é ligado
// à performance dos blocos 1, 2 e 3, e o Bloco 3 desses cargos será criado depois.
const pessoaDe = (f) => ({
  id: f.id, nome: nomeProprio(f.nome_funcionario), nomeErp: normNome(f.nome_funcionario),
  codigo: f.codigo_sistema_bi ? String(f.codigo_sistema_bi).trim() : null, cargo: f.cargo_nome,
})
// Funcionários "1 - Trabalhando" da empresa nos cargos da lista (consultor/mecânico: só do departamento
// da função, ex. OFICINA (SERVIÇOS), porque os indicadores são da oficina).
function porListaDeCargos(funcionarios, u, cargos, departamento = null) {
  const alvo = new Set((cargos || []).map(normNome))
  return (funcionarios || [])
    .filter((f) => f.empresa_id === u.empresaId && alvo.has(normNome(f.cargo_nome))
      && (!departamento || f.departamentos.some((d) => normNome(d) === normNome(departamento))))
    .map(pessoaDe)
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
function montarParticipantes(funcionarios, u, regras, unidade) {
  const lista = regras.cargosLinha?.[unidade] || {}
  const dep = (fn) => CAMPANHA.funcoes[fn]?.departamento || null
  return {
    consultores: lista.consultor ? porListaDeCargos(funcionarios, u, lista.consultor, dep('consultor')) : consultoresDaUnidade(funcionarios, u),
    mecanicos: lista.mecanico ? porListaDeCargos(funcionarios, u, lista.mecanico, dep('mecanico')) : mecanicosDaUnidade(funcionarios, u, regras),
    chefes: lista.chefe ? porListaDeCargos(funcionarios, u, lista.chefe) : porCargosDaUnidade(funcionarios, u, regras, 'chefe'),
    gerentes: lista.gerente ? porListaDeCargos(funcionarios, u, lista.gerente) : porCargosDaUnidade(funcionarios, u, regras, 'gerente'),
    // Funções do Bônus-alvo ainda sem Bloco 3: aparecem na tabela com "—".
    semCalculo: {
      box: porListaDeCargos(funcionarios, u, lista.box || []),
      prog: porListaDeCargos(funcionarios, u, lista.prog || []),
    },
    grupos: Object.entries(regras.gruposBonus?.[unidade] || {}).map(([k, g]) => ({
      k, nome: g.nome || 'Grupo', pessoas: porListaDeCargos(funcionarios, u, g.cargos),
    })),
  }
}

export default function BiCampanha() {
  const { user, hasPermission, hasActionOrDefault } = useAuth()
  const abasVisiveis = CAMPANHA_ABAS.filter((a) => hasPermission(a.perm))
  const empresasVisiveis = [{ id: 'TRUCKS', nome: 'CAIOBÁ TRUCKS' }, ...CAMPANHA.unidades].filter((x) => hasPermission(PERM_EMPRESA[x.id]))
  const [aba, setAba] = useState(() => abasVisiveis[0]?.k || 'regras')
  const [slotAcoes, setSlotAcoes] = useState(null) // elemento à direita das abas (Salvar + engrenagem da aba Regras)
  // Sempre abre SEM empresa: o usuário escolhe no seletor do topo e só então as informações aparecem.
  const [unidade, setUnidade] = useState('')
  // Se a aba/empresa aberta não estiver liberada (permissões carregadas depois), vai para a primeira liberada.
  useEffect(() => {
    if (abasVisiveis.length && !abasVisiveis.some((a) => a.k === aba)) setAba(abasVisiveis[0].k)
    if (unidade && !empresasVisiveis.some((x) => x.id === unidade)) setUnidade('')
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const podeAtualizar = hasActionOrDefault('bi/campanha/apuracao', 'atualizar_numeros') // botão só na aba Apuração
  const permRegras = {
    editar: hasActionOrDefault('bi/campanha/regras', 'editar'),
    zerar: hasActionOrDefault('bi/campanha/regras', 'zerar'),
    zerarTodas: hasActionOrDefault('bi/campanha/regras', 'zerar_todas'),
    copiarMes: hasActionOrDefault('bi/campanha/regras', 'copiar_mes_anterior'),
    copiarTodas: hasActionOrDefault('bi/campanha/regras', 'copiar_todas'),
  }

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
    if (!unidade) { setRegras(REGRAS_PADRAO); setOrigemRegras(null); return undefined }
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

  // Periodicidade de pagamento: só é escolhida no mês de ORIGEM do período (1º mês do bimestre /
  // trimestre, calendário fixo). Nos meses seguintes ela vem travada do mês de origem.
  const [periodicidadeOrigem, setPeriodicidadeOrigem] = useState({}) // { mês de origem: periodicidade }
  useEffect(() => {
    let vivo = true
    setPeriodicidadeOrigem({})
    if (!unidade) return undefined
    const m = Number(mes)
    const origens = [...new Set([inicioTrimestre(m), inicioBimestre(m)])].filter((o) => o !== m)
    Promise.all(origens.map((o) => apiService.getCampanhaRegras(Number(ano), o, unidade).catch(() => null)))
      .then((linhas) => {
        if (vivo) setPeriodicidadeOrigem(Object.fromEntries(origens.map((o, i) => [o, periodicidadeDe(mesclarRegras(REGRAS_PADRAO, linhas[i]?.dados))])))
      })
    return () => { vivo = false }
  }, [ano, mes, unidade, regras])
  const travaPeriodicidade = useMemo(() => {
    const m = Number(mes)
    const q0 = inicioTrimestre(m), b0 = inicioBimestre(m)
    if (q0 !== m && periodicidadeOrigem[q0] === 'trimestral') return { periodicidade: 'trimestral', mesOrigem: q0 }
    if (b0 !== m && periodicidadeOrigem[b0] === 'bimestral') return { periodicidade: 'bimestral', mesOrigem: b0 }
    return null
  }, [mes, periodicidadeOrigem])
  const periodicidadeEfetiva = travaPeriodicidade ? travaPeriodicidade.periodicidade : periodicidadeDe(regras)

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
  const [cargosLista, setCargosLista] = useState([]) // menu Cargos (seletor de cargos do Bônus-alvo)
  useEffect(() => {
    (async () => {
      try {
        const [funcs, cargos, empresas, deptos] = await Promise.all([
          apiService.getFuncionarios(), apiService.getCargos(), apiService.getEmpresas(), apiService.getDepartamentos(),
        ])
        setNomeEmpresa(Object.fromEntries(empresas.map((e) => [e.id, e.empresa_fantasia || e.nome_empresa])))
        setCargosLista(cargos)
        const agrupamentoDoCargo = Object.fromEntries(cargos.map((c) => [c.id, c.nome_agrupamento_cargo]))
        // Rótulo "DEPARTAMENTO (AGRUPAMENTO)", ex.: "OFICINA (SERVIÇOS)" — mesmo formato do cadastro.
        const rotuloDepto = Object.fromEntries(deptos.map((d) => [
          d.id, d.agrupamento_departamento_nome ? `${d.nome_departamento} (${d.agrupamento_departamento_nome})` : d.nome_departamento,
        ]))
        // Só quem está "1 - Trabalhando" ou "9 - Férias" no menu Funcionários.
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
  // Quem participa: cargos agrupados em cada linha do Bônus-alvo (montarParticipantes).
  const participantes = useMemo(() => montarParticipantes(funcionarios, u, regras, unidade), [funcionarios, u, regras, unidade])
  const { consultores, mecanicos, chefes, gerentes, grupos, semCalculo } = participantes
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
            <Trophy className="h-5 w-5 text-blue-600" /> Campanha Pós-Venda - DAF
          </h1>
          {sync.mensagem && <p role="status" className="text-xs text-slate-600 mt-1">{sync.mensagem}</p>}
          {erroDados && <p className="text-xs text-red-600 mt-1">Não foi possível carregar os dados: {erroDados}</p>}
        </div>
        {/* Mesmo modelo do topo da Matriz KPIs: botão só com o ícone + "Ano:" / "Mês:" ao lado. */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Empresa (antes do Ano) — vale para todas as abas; só as liberadas no grupo de acesso.
              Largura mínima para caber o nome inteiro (ex.: CAIOBÁ TRUCKS - CHAPADÃO). */}
          {empresasVisiveis.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Empresa:</span>
              <select className={`${SEL_TOPO} min-w-[18rem] ${unidade ? '' : 'border-blue-400 ring-2 ring-blue-500/20 text-slate-500'}`} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="" disabled>Selecione uma empresa</option>
                {empresasVisiveis.map((x) => <option key={x.id} value={x.id}>{nomeEmpresa[x.empresaId] || x.nome}</option>)}
              </select>
            </label>
          )}
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

      <div className="flex gap-1 border-b border-slate-200">
        {abasVisiveis.map(({ k, label, icon: Icon }) => (
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
        {/* Direita da linha das abas: Atualizar números (só na aba Apuração) e, na aba Regras, o
            Salvar e a engrenagem (colocados no slot via portal). */}
        <div className="ml-auto flex items-center gap-2 pb-1.5">
          {/* Mesma atualização do botão da Matriz KPIs (Matriz + Campanha). Travado em todas as telas
              enquanto qualquer pessoa estiver atualizando. */}
          {aba === 'apuracao' && podeAtualizar && <button type="button" onClick={() => sync.iniciar(user?.email)} disabled={sync.executando}
            title={sync.executando ? `Atualizando…${sync.porQuem ? ` (iniciada por ${sync.porQuem})` : ''} — aguarde terminar` : 'Atualizar números'}
            aria-label={sync.executando ? 'Atualizando' : 'Atualizar números'}
            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${sync.executando ? 'animate-spin' : ''}`} />
          </button>}
          <div ref={setSlotAcoes} className="flex items-center gap-2" />
        </div>
      </div>

      {!empresasVisiveis.length && (
        <p className={`${CARD} p-6 text-sm text-slate-600`}>
          Nenhuma empresa da campanha está liberada para o seu grupo de acesso. Peça a liberação em Configurações › Grupos de Acessos.
        </p>
      )}
      {!!empresasVisiveis.length && !unidade && (
        <div className={`${CARD} p-10 flex flex-col items-center justify-center gap-2 text-center`}>
          <Trophy className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Selecione uma empresa</p>
          <p className="text-xs text-slate-500">Escolha a empresa no seletor <b>Empresa</b>, no canto superior direito, para ver as informações da campanha.</p>
        </div>
      )}
      {!!empresasVisiveis.length && !!unidade && aba === 'regras' && (
        <AbaRegras slotAcoes={slotAcoes} cargosLista={cargosLista} permRegras={permRegras} travaPeriodicidade={travaPeriodicidade}
          onSalvarMes={(m, dados) => apiService.salvarCampanhaRegras(Number(ano), m, unidade, dados, user?.email || null)}
          onSalvarOutra={(destino, dados) => apiService.salvarCampanhaRegras(Number(ano), Number(mes), destino, dados, user?.email || null)} campanha={campanha} unidade={unidade} semCalendario={semCalendario} nomeMes={nomeMes} ano={ano} mes={mes}
          regras={regras} onSalvar={salvarRegras} origemRegras={origemRegras}
          nomeEmpresa={unidade === 'TRUCKS' ? 'CAIOBÁ TRUCKS' : (nomeEmpresa[u.empresaId] || u.nome)} />
      )}
      {!!empresasVisiveis.length && !!unidade && aba === 'apuracao' && (
        <AbaApuracao campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade}
          blocosMatriz={blocosMatriz} ano={ano} mes={mes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} versaoDados={recarregar} grupos={grupos} semCalculo={semCalculo} />
      )}
      {!!empresasVisiveis.length && !!unidade && aba === 'pagamento' && (
        <AbaPagamento ano={ano} mes={mes} unidade={unidade} periodicidade={periodicidadeEfetiva} funcionarios={funcionarios} erroFunc={erroFunc}
          calendarios={calendarios} versaoDados={recarregar} />
      )}
      {!!empresasVisiveis.length && !!unidade && aba === 'resultado' && (
        <AbaApuracao modo="resultado" campanha={campanha} regras={regras} unidade={unidade} ehTrucks={ehTrucks} diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
          gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade}
          blocosMatriz={blocosMatriz} ano={ano} mes={mes}
          metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc} versaoDados={recarregar} grupos={grupos} semCalculo={semCalculo} />
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
  gerentesGerais, metasPorUnidade, blocosMatriz, ano, mes, modo = 'apuracao', versaoDados = 0, onColeta = null, grupos = [], semCalculo = {} }) {
  const comum = { campanha, regras, unidade, diario, blocosMatriz, ano, mes, versaoDados, carregandoFunc: funcionarios === null }
  const ctx = useMemo(() => ({ faixas: faixasDe(regras, unidade) || [], regras, unidade, modo, ano, mes, onColeta }), [regras, unidade, modo, ano, mes, onColeta])
  const pesoB3 = blocosMatriz.pesos?.individual || 0
  // Funções = linhas do Bônus-alvo (aba Regras), na mesma ordem. Cada uma vira uma seção da tabela.
  const funcoes = linhasBonus(regras, unidade, CAMPANHA.unidades)
  const conteudo = ehTrucks
    ? (funcoes.length ? <BlocoGerenteGeral key="gg" {...comum} gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade} /> : null)
    : funcoes.map((l) => {
      // Pessoas da função = cargos agrupados na linha do Bônus-alvo.
      const pessoas = { consultor: consultores, mecanico: mecanicos, chefe: chefes, gerente: gerentes }[l.k]
        || (l.grupo ? (grupos.find((g) => g.k === l.k)?.pessoas || []) : (semCalculo[l.k] || []))
      // Valores = quadro do Bloco 3 escolhido na janela de Cargos (individual ou total). Sem quadro → "—".
      const cfg = cfgQuadroDaLinha(regras, unidade, l.k)
      if (!cfg.quadro) return <SecaoSemCalculo key={l.k} titulo={l.nome} pessoas={pessoas} campanha={campanha} />
      return <BlocoMatriz key={l.k} {...comum} titulo={l.nome} chaveBonus={l.k} cor={CORES_FUNCAO[l.k] || '#64748b'} pessoas={pessoas} cfg={cfg} />
    })

  if (modo === 'coleta') return <FaixasCtx.Provider value={ctx}>{conteudo}</FaixasCtx.Provider>
  return (
    <FaixasCtx.Provider value={ctx}>
    <div className="space-y-3">
      {erroFunc && <p className="text-xs text-red-600">Não foi possível carregar os funcionários: {erroFunc}</p>}
      {!funcoes.length ? (
        <p className={`${CARD} p-6 text-sm text-slate-600`}>Nenhuma função no Bônus-alvo desta empresa. Cadastre as funções na aba Regras.</p>
      ) : (
        <div className={CARD}>
          <div className="overflow-x-auto">
            {/* Uma tabela só: cabeçalho único e uma seção (tbody) por função do Bônus-alvo. */}
            <table className="w-full min-w-[56rem] table-fixed text-xs border-collapse">
              <CabecalhoTabela modo={modo} semanas={campanha.semanas} pesoB3={pesoB3} />
              {conteudo}
            </table>
          </div>
        </div>
      )}
    </div>
    </FaixasCtx.Provider>
  )
}

// ======================================================================================
// Pagamento — só os valores a pagar, por período e por bloco. A periodicidade vem da regra-chave
// "Pagamento" (aba Regras do mês selecionado): semanal, mensal, bimestral ou trimestral (bimestres e
// trimestres no calendário fixo). O bônus continua apurado semana a semana (mesmo cálculo da aba
// Resultado); aqui só se soma o acumulado do período — sem regra extra de liberação do acumulado.
// Cada mês do período é calculado com os dados e as regras DAQUELE mês (MesPagamento, invisível).
// ======================================================================================
// Blocos 1 (Corporativo) e 2 (Departamental): regras ainda não criadas — não pagam no Pagamento.
const BLOCOS_1_2_COM_REGRA = false

const PERIODICIDADES = [
  { v: 'semanal', label: 'Semanal' },
  { v: 'mensal', label: 'Mensal' },
  { v: 'bimestral', label: 'Bimestral' },
  { v: 'trimestral', label: 'Trimestral' },
]
const periodicidadeDe = (regras) => regras?.regrasChave?.periodicidadePagamento || 'mensal'

// 1º mês do trimestre / bimestre (calendário fixo) que contém o mês m (1–12).
const inicioTrimestre = (m) => m - ((m - 1) % 3)
const inicioBimestre = (m) => m - ((m - 1) % 2)

// Meses (1–12) do período de pagamento que contém o mês escolhido (calendário fixo).
function mesesDoPeriodo(periodicidade, mes) {
  const m = Number(mes)
  if (periodicidade === 'bimestral') { const ini = m - ((m - 1) % 2); return [ini, ini + 1] }
  if (periodicidade === 'trimestral') { const ini = m - ((m - 1) % 3); return [ini, ini + 1, ini + 2] }
  return [m]
}

// Um mês do período de pagamento, calculado por inteiro (dados, regras e pessoas daquele mês) sem
// desenhar nada: usa a mesma Apuração em modo "coleta", que devolve o bônus de cada pessoa.
function MesPagamento({ ano, mes, unidade, funcionarios, erroFunc, calendarios, versaoDados, onColeta, onSemRegras }) {
  const [diario, setDiario] = useState(null)
  const [metasAprovadas, setMetasAprovadas] = useState(null)
  const [regras, setRegras] = useState(null)
  useEffect(() => {
    let vivo = true
    setDiario(null)
    Promise.all([
      apiService.getCampanhaDiario(Number(ano), mes),
      apiService.getCampanhaMetasAprovadas(Number(ano), mes),
      apiService.getCampanhaRegras(Number(ano), mes, unidade).catch(() => null),
    ])
      .then(([linhas, aprovadas, linhaRegras]) => {
        if (!vivo) return
        setRegras(mesclarRegras(REGRAS_PADRAO, linhaRegras?.dados))
        onSemRegras?.(mes, !linhaRegras?.dados) // sem regras salvas → o mês não paga (Pagamento)
        setMetasAprovadas(aprovadas)
        setDiario(linhas)
      })
      .catch(() => { if (vivo) { setRegras(REGRAS_PADRAO); setMetasAprovadas(null); setDiario([]) } })
    return () => { vivo = false }
  }, [ano, mes, unidade, versaoDados])

  const { semanas } = useMemo(() => montarSemanas(Number(ano), mes, calendarios, CAMPANHA), [ano, mes, calendarios])
  const campanha = useMemo(() => ({ ...CAMPANHA, semanas }), [semanas])
  const u = campanha.unidades.find((x) => x.id === unidade) || campanha.unidades[0]
  const r = regras || REGRAS_PADRAO
  const { consultores, mecanicos, chefes, gerentes, grupos, semCalculo } = useMemo(() => montarParticipantes(funcionarios, u, r, unidade), [funcionarios, u, r, unidade])
  const gerentesGerais = useMemo(() => gerentesGeraisTrucks(funcionarios, r), [funcionarios, r])
  const metasUnidade = useMemo(() => metasAprovadasDaUnidade(metasAprovadas, u.empresaId), [metasAprovadas, u.empresaId])
  const metasPorUnidade = useMemo(
    () => Object.fromEntries(CAMPANHA.unidades.map((x) => [x.id, metasAprovadasDaUnidade(metasAprovadas, x.empresaId)])),
    [metasAprovadas],
  )
  const blocosMatriz = useMemo(() => ({ q: trimestreDoMes(String(mes).padStart(2, '0')), pesos: r.pesosBlocos }), [mes, r.pesosBlocos])
  const coleta = useCallback((titulo, dados) => onColeta(mes, titulo, dados), [mes, onColeta])

  if (!regras) return null
  return (
    <AbaApuracao modo="coleta" onColeta={coleta} campanha={campanha} regras={regras} unidade={unidade} ehTrucks={unidade === 'TRUCKS'}
      diario={diario} consultores={consultores} mecanicos={mecanicos} chefes={chefes} gerentes={gerentes}
      gerentesGerais={gerentesGerais} metasPorUnidade={metasPorUnidade} blocosMatriz={blocosMatriz}
      ano={ano} mes={String(mes).padStart(2, '0')} metasUnidade={metasUnidade} funcionarios={funcionarios} erroFunc={erroFunc}
      versaoDados={versaoDados} grupos={grupos} semCalculo={semCalculo} />
  )
}

function AbaPagamento({ ano, mes, unidade, periodicidade, funcionarios, erroFunc, calendarios, versaoDados }) {
  const meses = mesesDoPeriodo(periodicidade, mes)
  const chaveMeses = meses.join(',')
  // coleta[mes][tituloDoBloco] = { cor, semanas, linhas } | null (carregando)
  const [coleta, setColeta] = useState({})
  useEffect(() => { setColeta({}) }, [ano, chaveMeses, unidade, versaoDados])
  const onColeta = useCallback((m, titulo, dados) => {
    setColeta((c) => ({ ...c, [m]: { ...(c[m] || {}), [titulo]: dados } }))
  }, [])
  // Meses do período SEM regras salvas para a empresa: não pagam nada (senão entrariam os valores
  // do padrão do sistema, que ninguém configurou).
  const [semRegras, setSemRegras] = useState({})
  useEffect(() => { setSemRegras({}) }, [ano, chaveMeses, unidade, versaoDados])
  const onSemRegras = useCallback((m, sem) => setSemRegras((x) => ({ ...x, [m]: sem })), [])
  const mesesSemRegras = meses.filter((m) => semRegras[m])

  const nomeMesN = (m) => MESES[m - 1]?.label
  const hoje = new Date()
  const emAberto = (m) => Number(ano) > hoje.getFullYear() || (Number(ano) === hoje.getFullYear() && m > hoje.getMonth() + 1)
  const ultimo = meses[meses.length - 1]
  const pagamentoEm = ultimo === 12 ? `${nomeMesN(1)}/${Number(ano) + 1}` : `${nomeMesN(ultimo + 1)}/${ano}`
  const rotuloPeriodo = periodicidade === 'trimestral' ? `${Math.ceil(meses[0] / 3)}º trimestre/${ano} (${nomeMesN(meses[0])} a ${nomeMesN(ultimo)})`
    : periodicidade === 'bimestral' ? `${Math.ceil(meses[0] / 2)}º bimestre/${ano} (${nomeMesN(meses[0])} e ${nomeMesN(ultimo)})`
      : `${nomeMesN(meses[0])}/${ano}`

  // Blocos (cargos) na ordem em que aparecem; carregando enquanto algum mês não entregou o bloco.
  const titulos = []
  for (const m of meses) for (const t of Object.keys(coleta[m] || {})) if (!titulos.includes(t)) titulos.push(t)
  const mesesProntos = meses.every((m) => coleta[m] && Object.keys(coleta[m]).length && Object.values(coleta[m]).every(Boolean))

  // Colunas do Bloco 3: semanal = semanas do mês; demais = um mês por coluna.
  const colunas = periodicidade === 'semanal'
    ? (Object.values(coleta[meses[0]] || {}).find(Boolean)?.semanas || []).map((label, i) => ({ k: `s${i}`, titulo: `Sem ${i + 1}`, sub: label, mes: meses[0], semana: i }))
    : meses.map((m) => ({ k: `m${m}`, titulo: nomeMesN(m), sub: emAberto(m) ? 'em aberto' : '', mes: m }))

  const TD = 'p-2 text-right whitespace-nowrap tabular-nums border-l border-slate-200'
  const VAZIO = <span className="text-slate-300">—</span>
  return (
    <div className="space-y-5">
      <div className={`${CARD} p-4 flex flex-wrap items-center justify-between gap-2`}>
        <p className="text-sm text-slate-700">
          <b>Pagamento {PERIODICIDADES.find((p) => p.v === periodicidade)?.label.toLowerCase()}</b> · {rotuloPeriodo}
        </p>
        <p className="text-xs text-slate-500">
          {periodicidade === 'semanal' ? 'Cada semana é paga após o seu fechamento.' : `Valor acumulado do período, pago em ${pagamentoEm}.`}
          {' '}Periodicidade definida em Regras › Regras-chave.
        </p>
      </div>

      {/* Cálculo de cada mês do período (invisível) */}
      <div className="hidden" aria-hidden="true">
        {meses.map((m) => (
          <MesPagamento key={`${ano}-${m}-${unidade}-${versaoDados}`} ano={ano} mes={m} unidade={unidade} funcionarios={funcionarios} erroFunc={erroFunc}
            calendarios={calendarios} versaoDados={versaoDados} onColeta={onColeta} onSemRegras={onSemRegras} />
        ))}
      </div>

      {mesesSemRegras.length > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          ⚠️ Sem regras salvas para esta empresa em <b>{mesesSemRegras.map(nomeMesN).join(', ')}</b> — {mesesSemRegras.length > 1 ? 'esses meses não pagam' : 'esse mês não paga'} até as regras serem criadas e salvas na aba Regras.
        </p>
      )}
      {!mesesProntos && (
        <div className={`${CARD} p-6 text-xs text-slate-500 flex items-center gap-2`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando os valores de {meses.map(nomeMesN).join(', ')}…
        </div>
      )}
      {/* Uma tabela só: cabeçalho único e uma seção por função do Bônus-alvo. */}
      {mesesProntos && titulos.length > 0 && (
        <div className={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs border-collapse">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[11%]" /><col className="w-[11%]" />
                {colunas.map((c) => <col key={c.k} />)}
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <th rowSpan={2} className={`${TH} text-left align-bottom border-b border-slate-200`}>Função / Nome</th>
                  <th rowSpan={2} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Bloco 1 - Corporativo</th>
                  <th rowSpan={2} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Bloco 2 - Departamental</th>
                  <th colSpan={colunas.length} className={`${TH} text-center border-l border-slate-200`}>Bloco 3 - Serviços</th>
                  <th rowSpan={2} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Total a pagar</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {colunas.map((c) => (
                    <th key={c.k} className={`${TH} text-right border-l border-slate-200`}>
                      {c.titulo}
                      {c.sub && <span className="block text-[9px] font-medium normal-case tracking-normal text-slate-400">{c.sub}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              {titulos.map((titulo) => {
                const secao = meses.map((m) => coleta[m][titulo]).find(Boolean)
                const cor = secao?.cor
                const semCalc = !!secao?.semCalculo
                const nCols = colunas.length + 4
                // Pessoas de todos os meses do período (quem saiu/entrou aparece com "—" no mês em que não estava).
                const pessoas = new Map()
                for (const m of meses) for (const l of coleta[m][titulo]?.linhas || []) if (!pessoas.has(l.id)) pessoas.set(l.id, l.nome)
                const valor = (id, col) => {
                  if (semCalc || semRegras[col.mes]) return null
                  const l = (coleta[col.mes][titulo]?.linhas || []).find((x) => x.id === id)
                  if (!l) return null
                  return col.semana != null ? (l.semanas[col.semana] ?? 0) : l.total
                }
                return (
                  <tbody key={titulo}>
                    <LinhaSecao titulo={titulo} cor={cor} colSpan={nCols}>
                      {semCalc && <span className="text-[10px] font-semibold text-slate-500">· sem quadro do Bloco 3</span>}
                    </LinhaSecao>
                    {!pessoas.size ? (
                      <tr><td colSpan={nCols} className="px-2 py-2 text-xs text-slate-500">Ninguém nesta função no período.</td></tr>
                    ) : [...pessoas].map(([id, nome]) => {
                      const vals = colunas.map((c) => valor(id, c))
                      // Blocos 1 e 2: soma da parte de cada mês do período em que a pessoa estava.
                      const doMes = meses.filter((m) => !semRegras[m]).map((m) => (coleta[m][titulo]?.linhas || []).find((x) => x.id === id)).filter(Boolean)
                      // Blocos 1 e 2 ainda SEM regras criadas: não pagam ("—"). Quando as regras existirem,
                      // ligar BLOCOS_1_2_COM_REGRA — a parte da Meta de cada mês é paga integralmente.
                      const b1 = BLOCOS_1_2_COM_REGRA && !semCalc && doMes.length ? doMes.reduce((a2, l) => a2 + (l.b1 || 0), 0) : null
                      const b2 = BLOCOS_1_2_COM_REGRA && !semCalc && doMes.length ? doMes.reduce((a2, l) => a2 + (l.b2 || 0), 0) : null
                      const total = vals.reduce((a2, v) => a2 + (v || 0), 0) + (b1 || 0) + (b2 || 0)
                      return (
                        <tr key={id} className="border-b border-slate-100">
                          <td className="p-2 font-medium text-slate-800 truncate" title={nome}>{nome}</td>
                          <td className={`${TD} ${b1 > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`} title={BLOCOS_1_2_COM_REGRA ? 'Bloco 1 - Corporativo: parte da Meta paga integralmente' : 'Bloco 1 - Corporativo: regras ainda não criadas'}>{b1 == null ? VAZIO : moedaBR(b1)}</td>
                          <td className={`${TD} ${b2 > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`} title={BLOCOS_1_2_COM_REGRA ? 'Bloco 2 - Departamental: parte da Meta paga integralmente' : 'Bloco 2 - Departamental: regras ainda não criadas'}>{b2 == null ? VAZIO : moedaBR(b2)}</td>
                          {vals.map((v, i) => (
                            <td key={colunas[i].k} className={`${TD} ${v > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                              {v == null ? VAZIO : moedaBR(v)}
                            </td>
                          ))}
                          <td className={`${TD} font-bold ${COR_TOTAL.real} ${total > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{semCalc ? VAZIO : moedaBR(total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                )
              })}
            </table>
          </div>
        </div>
      )}
    </div>
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
  const supermeta = Number(sv) || 0 // só o valor digitado (não preenche mais 120% da Meta sozinho)
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
// Funções da Apuração — valores do quadro do Bloco 3 - Serviços (Matriz KPIs) escolhido em cada função
// do Bônus-alvo. Contribuição da semana = linha Total do quadro (soma peso × atingimento).
// ======================================================================================

// Peso da semana na unidade: dias úteis da semana ÷ dias úteis do mês (calendário da empresa).
function fracaoSemana(campanha, unidade, s) {
  const pt = pesoTotal(campanha, unidade)
  return pt ? pesoSemana(s, unidade) / pt : 0
}
const dentro = (r, s) => r.data >= s.inicio && r.data <= s.fim

const div = (a, b) => (b ? a / b : null)

// Botão (ícone de documento) que abre um pop-up só de leitura com o Bloco 3 - Serviços da Matriz
// KPIs — de onde vêm os valores das tabelas —, na visão Semanal do ano/mês escolhidos na Campanha.
// pessoas: nomes do bloco na Campanha (só da empresa selecionada) — o seletor do pop-up lista só esses.
function LinkBloco3({ matrizB3, pessoas }) {
  const { ano, mes, modo, unidade } = useContext(FaixasCtx)
  const { hasActionOrDefault } = useAuth()
  const podeVer = hasActionOrDefault(modo === 'resultado' ? 'bi/campanha/resultado' : 'bi/campanha/apuracao', 'ver_matriz')
  const empresaErp = CAMPANHA.unidades.find((u) => u.id === unidade)?.empresaErp || null
  // Quadro da Matriz deste bloco: "Bloco 3 - Serviços › Consultor de Serviços" → "CONSULTOR DE SERVIÇOS".
  const quadro = String(matrizB3 || '').split('› ')[1]?.toUpperCase() || null
  const [aberto, setAberto] = useState(false)
  useEffect(() => {
    if (!aberto) return undefined
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aberto])
  if (!podeVer) return null
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}
        title="Ver o Bloco 3 - Serviços (Matriz KPIs)" aria-label="Ver o Bloco 3 - Serviços (Matriz KPIs)"
        className="h-4 w-4 inline-flex items-center justify-center rounded text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <FileText className="h-3.5 w-3.5" />
      </button>
      {aberto && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div role="dialog" aria-modal="true" aria-label="Bloco 3 - Serviços"
            className="w-full max-w-[96vw] h-[92vh] flex flex-col rounded-xl bg-slate-50 shadow-2xl normal-case tracking-normal text-left font-normal">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-white rounded-t-xl">
              <div>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Bloco 3 - Serviços · Matriz KPIs</p>
                <p className="text-[11px] text-slate-500">Somente visualização — {MESES[Number(mes) - 1]?.label}/{ano}</p>
              </div>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <Bloco3ServicosVisualizacao ano={Number(ano)} mes={Number(mes)} quadro={quadro} pessoas={pessoas} empresa={empresaErp} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// % sem casas decimais quando inteiro (80%, 120%) — rótulo curto das faixas na Apuração.
const pctCurto = (v) => { const p = Math.round((Number(v) || 0) * 10000) / 100; return `${p.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` }

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

// Bônus de uma pessoa no mês, semana a semana (usado pelo Resultado e pelo Pagamento):
// contribuição da semana → faixa → % aplicado × bônus-alvo da semana do Bloco 3 (Meta ou Supermeta
// × % do Bloco 3 na divisão do bônus ÷ nº de semanas). Regra-chave de atingimento mínimo do mês (bloqueio) e "Mês zerado" (alerta) zeram tudo.
function bonusDaLinha(p, { pesoB3, faixas, regras, unidade, chaveBonus, nSem }) {
  const alvo = bonusAlvoDe(regras, p.unidadeBonus ? 'TRUCKS' : unidade, p.chaveBonus || chaveBonus)
  const cels = celulasDaLinha(p, pesoB3)
  const bloqueio = bloqueioAtingimentoMinimo(regras, totalDaLinha(p, cels).total)
  const calc = cels.map((c) => {
    const fx = c.semDiaUtil ? null : faixaDoValor(c.contrib, faixas)
    if (!fx || fx.abaixo || p.alerta || bloqueio) return { fx, valor: 0 }
    const mensal = fx.base === 'supermeta' ? alvo.supermeta : alvo.meta
    const parteB3 = mensal * (pesoB3 || 0) // parte do bônus do Bloco 3 (divisão em Bônus-alvo)
    const base = parteB3 / (nSem || 1)
    return { fx, mensal, parteB3, base, valor: base * (fx.paga || 0) }
  })
  return { cels, bloqueio, calc, total: calc.reduce((a, c) => a + c.valor, 0) }
}

// Modo "coleta" (aba Pagamento): não desenha nada — calcula o bônus de cada pessoa do bloco no mês
// e entrega para a aba Pagamento (ctx.onColeta). null = ainda carregando.
function ColetaBonus({ titulo, cor, campanha, linhas, carregando, pesoB3, faixas, regras, unidade, chaveBonus, onColeta }) {
  const nSem = campanha.semanas.length || 1
  const dados = carregando ? null : {
    cor,
    semanas: campanha.semanas.map((sm) => sm.label),
    linhas: linhas.map((p) => {
      const r = bonusDaLinha(p, { pesoB3, faixas, regras, unidade, chaveBonus, nSem })
      // Blocos 1 e 2: parte da Meta do mês, paga integralmente (sem faixas), só por mês.
      const meta = bonusAlvoDe(regras, p.unidadeBonus ? 'TRUCKS' : unidade, p.chaveBonus || chaveBonus).meta
      const b1 = meta * (Number(regras?.pesosBlocos?.companhia) || 0)
      const b2 = meta * (Number(regras?.pesosBlocos?.departamento) || 0)
      return { id: p.id, nome: p.nome, semanas: r.calc.map((c) => c.valor), total: r.total, b1, b2 }
    }),
  }
  const chave = JSON.stringify(dados)
  useEffect(() => { onColeta?.(titulo, dados) }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ======================================================================================
// Tabela única (Apuração e Resultado): um cabeçalho só e, para cada função do Bônus-alvo, um <tbody>
// com a linha-título da função e as pessoas dela. Cada bloco (Consultores, Mecânicos…) desenha só o
// seu <tbody>; quem monta o <table> e o cabeçalho é a AbaApuracao.
// ======================================================================================

// Nº de colunas de dados por semana em cada modo (Apuração: Contrib. + Faixa; Resultado: valor).
const colsPorSemana = (modo) => (modo === 'resultado' ? 1 : 2)

// Coluna "Situação bônus" (depois do Total): Não liberado quando a regra-chave de atingimento
// mínimo do mês bloqueia; senão Liberado.
function CelulaSituacao({ bloqueio }) {
  return (
    <td className="p-2 text-center border-l border-slate-200" title={bloqueio || 'Bônus liberado'}>
      {bloqueio
        ? <span className="text-[10px] font-semibold px-1.5 py-px rounded border bg-amber-50 text-amber-700 border-amber-200">Não liberado</span>
        : <span className="text-[10px] font-semibold px-1.5 py-px rounded border bg-emerald-50 text-emerald-700 border-emerald-200">Liberado</span>}
    </td>
  )
}

// Linha-título de uma função dentro da tabela única.
function LinhaSecao({ titulo, cor, colSpan, children }) {
  return (
    <tr className="bg-slate-100/80 border-y border-slate-200">
      <td colSpan={colSpan} className="px-2 py-1.5">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} /> {titulo}
          {children}
        </span>
      </td>
    </tr>
  )
}

// Cabeçalho da tabela única (Apuração ou Resultado).
function CabecalhoTabela({ modo, semanas, pesoB3 }) {
  const ehResultado = modo === 'resultado'
  return (
    <>
      <colgroup>
        <col className={ehResultado ? 'w-[24%]' : 'w-[19%]'} />
        {semanas.map((s) => (ehResultado
          ? <col key={s.id} />
          : <React.Fragment key={s.id}><col className="w-[6%]" /><col /></React.Fragment>))}
        <col className={ehResultado ? 'w-[11%]' : 'w-[7%]'} />
        <col className="w-[8%]" />
      </colgroup>
      <thead>
        <tr className="bg-slate-50 border-t border-slate-200">
          <th rowSpan={ehResultado ? 2 : 3} className={`${TH} text-left align-bottom border-b border-slate-200`}>Função / Nome</th>
          <th colSpan={semanas.length * colsPorSemana(modo)} className={`${TH} text-center border-l border-slate-200`}>
            Bloco 3 - Serviços ({pctTxt(pesoB3)}) — {ehResultado ? 'bônus por semana' : 'contribuição por semana'}
          </th>
          <th rowSpan={ehResultado ? 2 : 3} className={`${TH} text-right align-bottom border-l border-b border-slate-200`}>Total</th>
          <th rowSpan={ehResultado ? 2 : 3} className={`${TH} text-center align-bottom border-l border-b border-slate-200`}>Situação bônus</th>
        </tr>
        <tr className={`bg-slate-50 ${ehResultado ? 'border-b border-slate-200' : ''}`}>
          {semanas.map((s, i) => (
            <th key={s.id} colSpan={colsPorSemana(modo)} className={`${TH} ${ehResultado ? 'text-right' : 'text-center'} border-l border-slate-200`} title={s.label}>
              Sem {i + 1}
              <span className="block text-[9px] font-medium normal-case tracking-normal text-slate-400">{s.label}</span>
            </th>
          ))}
        </tr>
        {!ehResultado && (
          <tr className="bg-slate-50 border-b border-slate-200">
            {semanas.map((s) => (
              <React.Fragment key={s.id}>
                <th className={`${TH} text-right border-l border-slate-200`} title="Contribuição">Contrib.</th>
                <th className={`${TH} text-center`} title="Faixa de pagamento (aba Regras) em que o valor da semana se encaixa">Faixa</th>
              </React.Fragment>
            ))}
          </tr>
        )}
      </thead>
    </>
  )
}

// Função do Bônus-alvo ainda SEM Bloco 3 (grupos criados em "Adicionar cargo", Box Express,
// Programação): aparece com as pessoas e "—". No Pagamento (modo coleta) entra com valores vazios.
function SecaoSemCalculo({ titulo, pessoas, campanha }) {
  const { modo, onColeta } = useContext(FaixasCtx)
  const cor = '#94a3b8'
  const dados = { cor, semCalculo: true, semanas: [], linhas: (pessoas || []).map((p) => ({ id: p.id, nome: p.nome, semanas: [], total: 0, b1: 0, b2: 0 })) }
  const chave = JSON.stringify(dados)
  useEffect(() => { if (modo === 'coleta') onColeta?.(titulo, dados) }, [chave, modo]) // eslint-disable-line react-hooks/exhaustive-deps
  if (modo === 'coleta') return null
  const semanas = campanha.semanas
  const nDados = semanas.length * colsPorSemana(modo)
  const VAZIO = <span className="text-slate-300">—</span>
  return (
    <tbody>
      <LinhaSecao titulo={titulo} cor={cor} colSpan={nDados + 3}>
        <span className="text-[10px] font-semibold text-slate-500">· sem quadro do Bloco 3 (escolha em Regras › Bônus-alvo › Cargos)</span>
      </LinhaSecao>
      {!(pessoas || []).length ? (
        <tr><td colSpan={nDados + 3} className="px-2 py-2 text-xs text-slate-500">Nenhuma pessoa “1 - Trabalhando” ou “9 - Férias” nos cargos desta função.</td></tr>
      ) : pessoas.map((p) => (
        <tr key={p.id} className="border-b border-slate-100">
          <td className="p-2 font-medium text-slate-800">{p.nome}</td>
          {Array.from({ length: nDados }, (_, i) => <td key={i} className="p-2 text-center border-l border-slate-100">{VAZIO}</td>)}
          <td className="p-2 text-right border-l border-slate-200">{VAZIO}</td>
          <td className="p-2 text-center border-l border-slate-200">{VAZIO}</td>
        </tr>
      ))}
    </tbody>
  )
}

// Limite de espera por chamada à Matriz: sem resposta em 60 s, a linha fica "—" em vez de travar a tabela.
const comLimiteTempo = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 60_000))])
// Quadros do Bloco 3 - Serviços sem pessoa: a Matriz exige a empresa (casa) e cada um tem seu parâmetro.
const PARAM_EMPRESA_QUADRO = { 'SETOR DE MECÂNICA': 'empresaOficina', 'CHEFE DE OFICINA': 'empresaChefeOficina', 'SETOR FUNILARIA/PINTURA': 'empresaFunilaria' }
// Endpoint da Matriz de cada quadro (abas Bloco 3 - Serviços / Bloco 3 - Peças).
const fetchDoQuadro = (bloco, quadro) => (bloco === 'pecas' ? fetchBloco3Pecas
  : (['CONSULTOR DE SERVIÇOS', 'MECÂNICO', ...Object.keys(PARAM_EMPRESA_QUADRO)].includes(quadro) ? fetchBloco3Servicos : fetchBloco3PosVenda))

// Uma função do Bônus-alvo avaliada pelo quadro do Bloco 3 escolhido na janela de Cargos:
// Individual = contribuição de cada pessoa (Matriz filtrada pelo nome); senão, total do quadro para todos.
function BlocoMatriz({ campanha, blocosMatriz, pessoas, carregandoFunc, ano, mes, versaoDados = 0, titulo, chaveBonus, cor, cfg }) {
  const { bloco, quadro, individual } = cfg
  const param = FILTRO_PESSOA[quadro]
  const porPessoa = individual && !!param
  // Quadros OFICINA / CHEFE DE OFICINA não têm pessoa: a Matriz exige a empresa (casa) — vai a da Campanha.
  const { unidade } = useContext(FaixasCtx)
  const paramEmpresa = PARAM_EMPRESA_QUADRO[quadro] || null
  const empresaOficina = paramEmpresa ? (CAMPANHA.unidades.find((u) => u.id === unidade)?.empresaErp || null) : null
  const sKeys = useMemo(() => semanasMatrizDoMes(ano, mes), [ano, mes])
  const mKey = `m${String(mes).padStart(2, '0')}`
  const [dados, setDados] = useState(new Map())
  const [carregando, setCarregando] = useState(false)
  useEffect(() => {
    let ativo = true
    if (!quadro || !pessoas.length || !sKeys.length || (paramEmpresa && !empresaOficina)) { setDados(new Map()); setCarregando(false); return undefined }
    setCarregando(true)
    const buscar = fetchDoQuadro(bloco, quadro)
    const ler = async (nome) => {
      try {
        const params = { year: Number(ano), _forceReload: versaoDados > 0 }
        if (nome) params[param] = nome
        if (empresaOficina) { params[paramEmpresa] = empresaOficina; params.apenas = quadro } // só esse quadro (rápido)
        const res = await comLimiteTempo(buscar(params))
        if (res?.source === 'mock') return null // backend fora do ar → dados de exemplo não valem
        const q = (res?.data || []).find((x) => normNome(x.tituloGerente) === normNome(quadro))
        return { semanas: sKeys.map((k) => contribSemanaMatriz(q, k)), mensal: contribSemanaMatriz(q, mKey) }
      } catch { return null }
    }
    const tarefas = porPessoa ? pessoas.map((p) => ler(p.nome).then((d) => [p.id, d])) : [ler(null).then((d) => ['__total', d])]
    Promise.all(tarefas)
      .then((entradas) => { if (ativo) setDados(new Map(entradas)) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [pessoas, ano, sKeys, mKey, quadro, bloco, porPessoa, param, versaoDados, empresaOficina, paramEmpresa])

  const vazio = { semanas: [], mensal: { contrib: null } }
  const linhas = pessoas.map((p) => {
    const d = (porPessoa ? dados.get(p.id) : dados.get('__total')) || vazio
    return {
      id: p.id,
      nome: p.nome,
      totalDireto: d.mensal?.contrib ?? null,
      semanas: campanha.semanas.map((_, i) => ({ itens: d.semanas[i]?.itens || [], contribDireta: d.semanas[i]?.contrib ?? null })),
    }
  })
  return (
    <ResumoSemanal titulo={titulo} cor={cor} campanha={campanha} linhas={linhas} chaveBonus={chaveBonus}
      blocosMatriz={blocosMatriz} matrizB3={bloco === 'servicos' && quadro ? `Bloco 3 - Serviços › ${quadro}` : ''}
      carregando={carregandoFunc || carregando}
      vazio="Nenhuma pessoa “1 - Trabalhando” ou “9 - Férias” nos cargos desta função." />
  )
}

// Resultado: linhas de uma função (valor do bônus por semana + ⓘ do cálculo e Total).
function ResultadoSemanal({ titulo, cor, campanha, linhas, carregando, vazio, pesoB3, faixas, regras, unidade, chaveBonus, matrizB3 }) {
  const { hasActionOrDefault } = useAuth()
  const podeVerCalculo = hasActionOrDefault('bi/campanha/resultado', 'ver_calculo')
  const semanas = campanha.semanas
  const nSem = semanas.length || 1
  const nCols = semanas.length + 3
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums'
  const rotuloFaixaTxt = (fx) => (fx.max == null ? `≥ ${pctTxt(fx.min)}` : `${pctTxt(fx.min)} a < ${pctTxt(fx.max)}`)
  return (
    <tbody>
      <LinhaSecao titulo={titulo} cor={cor} colSpan={nCols}>
        {matrizB3 && <LinkBloco3 matrizB3={matrizB3} pessoas={linhas.map((l) => l.nome)} />}
      </LinhaSecao>
      {carregando ? (
        <tr><td colSpan={nCols} className="px-2 py-2 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</span></td></tr>
      ) : !linhas.length ? (
        <tr><td colSpan={nCols} className="px-2 py-2 text-xs text-slate-500">{vazio}</td></tr>
      ) : linhas.map((p) => {
        const { cels, bloqueio, calc, total } = bonusDaLinha(p, { pesoB3, faixas, regras, unidade, chaveBonus, nSem })
        return (
          <tr key={p.id} className="border-b border-slate-100">
            <td className="p-2 font-medium text-slate-800 leading-tight [&>span]:mt-1 [&>span]:ml-0 [&>span]:inline-block" title={p.nome}>
              <span className="block !mt-0">{p.nome}</span>
              {p.alerta && (
                <span className="ml-2 text-[10px] font-semibold px-1.5 py-px rounded border bg-red-50 text-red-700 border-red-200" title={p.alerta}>Mês zerado</span>
              )}
            </td>
            {calc.map((k, i) => {
              const c = cels[i]
              const nomeBase = k.fx?.base === 'supermeta' ? 'Supermeta' : 'Meta'
              let corpo
              if (c.semDiaUtil) corpo = <p>Semana sem dia útil — não entra no cálculo.</p>
              else if (bloqueio && !p.alerta) corpo = <><LinhaCalc rotulo="Contribuição da semana" valor={c.contrib == null ? '—' : pctTxt(c.contrib)} /><p className="mt-1 text-amber-700">{bloqueio}</p></>
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
                    <LinhaCalc rotulo={`Parte do Bloco 3 (${pctTxt(pesoB3)})`} valor={moedaBR(k.parteB3)} />
                    <LinhaCalc rotulo={`Bloco 3 por semana (÷ ${nSem})`} valor={moedaBR(k.base)} />
                    <LinhaCalc rotulo={`${pctTxt(k.fx.paga)} × ${moedaBR(k.base)}`} valor={moedaBR(k.valor)} destaque />
                  </>
                )
              }
              return (
                <td key={semanas[i].id} className={`${TD} border-l border-slate-200`}>
                  <span className="inline-flex items-center justify-end gap-1.5 w-full">
                    {podeVerCalculo && <InfoCalculo titulo={`${p.nome} · Sem ${i + 1} (${semanas[i].label})`}>{corpo}</InfoCalculo>}
                    <span className={`font-semibold ${k.valor > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{moedaBR(k.valor)}</span>
                  </span>
                </td>
              )
            })}
            <td className={`${TD} border-l border-slate-200 font-bold ${COR_TOTAL.real} ${total > 0 ? 'text-emerald-700' : 'text-slate-500'}`}
              title="Soma dos valores de bônus das semanas">
              {moedaBR(total)}
            </td>
            <CelulaSituacao bloqueio={bloqueio} />
          </tr>
        )
      })}
    </tbody>
  )
}

// Apuração: linhas de uma função (contribuição e faixa por semana + Total). Em modo "coleta" entrega
// os valores para o Pagamento; em "resultado" desenha o Resultado.
// linhas: [{ id, nome, alerta?, semanas: [{ fr, itens }] }]
function ResumoSemanal({ titulo, cor, campanha, linhas, carregando, vazio, blocosMatriz, matrizB3, chaveBonus }) {
  const VAZIO = <span className="text-slate-300">—</span>
  const pesoB3 = blocosMatriz.pesos?.individual || 0
  const semanas = campanha.semanas
  const { faixas, regras, unidade, modo, onColeta } = useContext(FaixasCtx)
  if (modo === 'coleta') {
    return <ColetaBonus titulo={titulo} cor={cor} campanha={campanha} linhas={linhas} carregando={carregando}
      pesoB3={pesoB3} faixas={faixas} regras={regras} unidade={unidade} chaveBonus={chaveBonus} onColeta={onColeta} />
  }
  if (modo === 'resultado') {
    return <ResultadoSemanal titulo={titulo} cor={cor} campanha={campanha} linhas={linhas} carregando={carregando} vazio={vazio}
      pesoB3={pesoB3} faixas={faixas} regras={regras} unidade={unidade} chaveBonus={chaveBonus} matrizB3={matrizB3} />
  }
  const nCols = semanas.length * 2 + 3
  const TD = 'p-2 text-right whitespace-nowrap tabular-nums border-l border-slate-200'
  const TDF = 'p-2 text-center whitespace-nowrap tabular-nums'
  const rotuloFaixa = (fx) => (fx.max == null ? `≥ ${pctCurto(fx.min)}` : `${pctCurto(fx.min)} a ${pctCurto(fx.max)}`)
  return (
    <tbody>
      <LinhaSecao titulo={titulo} cor={cor} colSpan={nCols}>
        {matrizB3 && <LinkBloco3 matrizB3={matrizB3} pessoas={linhas.map((l) => l.nome)} />}
      </LinhaSecao>
      {carregando ? (
        <tr><td colSpan={nCols} className="px-2 py-2 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…</span></td></tr>
      ) : !linhas.length ? (
        <tr><td colSpan={nCols} className="px-2 py-2 text-xs text-slate-500">{vazio}</td></tr>
      ) : linhas.map((p) => {
        const cels = celulasDaLinha(p, pesoB3)
        const temTotalDireto = Object.prototype.hasOwnProperty.call(p, 'totalDireto')
        const { total, parcial } = totalDaLinha(p, cels)
        // Mesma regra-chave do Resultado: atingimento do mês abaixo do mínimo → "Não liberado".
        const bloqueio = bloqueioAtingimentoMinimo(regras, total)
        return (
          <tr key={p.id} className="border-b border-slate-100">
            <td className="p-2 font-medium text-slate-800 leading-tight [&>span]:mt-1 [&>span]:ml-0 [&>span]:inline-block" title={p.nome}>
              <span className="block !mt-0">{p.nome}</span>
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
            <CelulaSituacao bloqueio={bloqueio} />
          </tr>
        )
      })}
    </tbody>
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
  const linhas = gerentesGerais.flatMap((g) => campanha.unidades.filter((x) => !linhaRemovida(regras, 'TRUCKS', `gg-${x.id}`)).map((x) => {
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
      vazio={`Nenhum funcionário "1 - Trabalhando" ou "9 - Férias" das empresas Trucks no agrupamento "${regras.funcoes.gerenteGeral.agrupamento}" com cargo de Gerente Geral de Pós-Vendas. Confira o cadastro em Funcionários.`} />
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
        className="w-28 text-xs font-semibold text-slate-900 text-right tabular-nums p-1.5 border-2 border-blue-300 rounded-md bg-amber-50/60 shadow-sm hover:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:font-normal"
        value={vazio ? '' : (texto ?? (value == null ? '' : moedaTxt(value)))} placeholder={vazio ? '' : 'Digitar'}
        onFocus={(e) => { setTexto(value == null ? '' : moedaTxt(value)); e.target.select() }}
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
        value={texto ?? (value == null ? '' : fmt(value))}
        onFocus={(e) => { setTexto(value == null ? '' : fmt(value)); e.target.select() }}
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
// Linhas excluídas na aba Regras (engrenagem › Excluir) ficam em regras.linhasRemovidas[unidade][linha] = true.
const linhaRemovida = (regras, unidade, k) => !!regras?.linhasRemovidas?.[unidade]?.[k]

// Nome editado (engrenagem › Editar) das funções fixas fica em regras.nomesLinha[unidade][linha];
// grupos criados guardam o nome no próprio grupo.
function linhasBonus(regras, unidade, unidades) {
  const nomes = regras?.nomesLinha?.[unidade] || {}
  return montarLinhasBonus(regras, unidade, unidades)
    .filter((l) => !linhaRemovida(regras, unidade, l.k))
    .map((l) => (!l.grupo && nomes[l.k] ? { ...l, nome: nomes[l.k] } : l))
}
function montarLinhasBonus(regras, unidade, unidades) {
  const F = regras.funcoes
  if (unidade === 'TRUCKS') {
    return unidades.map((u) => ({
      k: `gg-${u.id}`, nome: `Gerente Geral · ${u.nome}`, cargos: ['funcoes', 'gerenteGeral', 'cargos'],
      meta: ['funcoes', 'gerenteGeral', 'valores', u.id, 'f100'],
      supermeta: ['funcoes', 'gerenteGeral', 'valores', u.id, 'f110'],
    }))
  }
  // Linha aparece se a função tem bônus na empresa (alvo > 0) ou se já tem cadeado registrado (ex.:
  // depois de "Zerar valores", Meta 0 com cadeado fechado — senão a linha sumiria da tabela).
  const travasU = regras.bonusBloqueado?.[unidade] || {}
  const porAlvo = (k, nome, semSupermeta = false) => ((F[k]?.alvo?.[unidade] || 0) > 0 || `${k}:meta` in travasU
    ? [{ k, nome, meta: ['funcoes', k, 'alvo', unidade], supermeta: ['funcoes', k, 'supermeta', unidade], cargos: ['cargosLinha', unidade, k] }]
    : [])
  return [
    ...porAlvo('consultor', 'Consultor Técnico'),
    ...porAlvo('mecanico', 'Mecânico'),
    ...porAlvo('box', 'Mecânico Box Express', true),
    ...(F.chefe?.participa?.[unidade] !== false
      ? [{ k: 'chefe', nome: 'Chefe de Oficina', meta: ['funcoes', 'chefe', 'valores', 'f100'], supermeta: ['funcoes', 'chefe', 'valores', 'f110'], cargos: ['cargosLinha', unidade, 'chefe'] }]
      : []),
    ...porAlvo('prog', 'Programação / Apontamento'),
    ...porAlvo('gerente', unidade === 'CG' ? 'Gerente de Serviços' : 'Gerente de Filial'),
    // Grupos criados em "Adicionar cargo" (regras.gruposBonus[unidade]).
    ...Object.entries(regras.gruposBonus?.[unidade] || {}).map(([k, g]) => ({
      k, nome: g.nome || 'Grupo', grupo: true,
      meta: ['gruposBonus', unidade, k, 'meta'], supermeta: ['gruposBonus', unidade, k, 'supermeta'],
      cargos: ['gruposBonus', unidade, k, 'cargos'],
    })),
  ]
}
const lerCaminho = (obj, caminho) => caminho.reduce((o, k) => (o == null ? undefined : o[k]), obj)


// Semanas do mês escolhido e dias úteis de cada uma (Calendário de cada empresa: sábado = 0,5,
// feriado = 0) + Bônus-alvo editável (Meta e Supermeta) da empresa selecionada.
// Texto para os colaboradores entenderem a campanha (topo da aba Regras). Não é editável e é GERAL:
// descreve como as regras funcionam, sem depender da empresa ou do mês escolhido (valores reais
// ficam nas tabelas da aba; aqui só exemplos).
function ComoFunciona() {
  // Abre/fecha ao clicar no título; sempre começa fechado.
  const [aberto, setAberto] = useState(false)
  const passo = 'flex gap-3'
  const num = 'h-6 w-6 shrink-0 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center'
  return (
    // Cor própria (verde claro) para se destacar das tabelas de regras.
    <section className={`rounded-lg border border-emerald-300 shadow-sm p-5 bg-gradient-to-br from-emerald-50 to-green-50/40 ${aberto ? 'space-y-4' : ''}`}>
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-3 text-left">
        <h2 className="text-base font-bold text-emerald-900">🏆 Como funciona a Campanha Pós-Venda - DAF</h2>
        <ChevronDown className={`h-4 w-4 text-emerald-700 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (<>
      <div>
        <p className="text-xs text-slate-600">
          A campanha premia, semana a semana, quem alcança os resultados do seu cargo. Quanto melhor o seu resultado na semana, maior o bônus. 💪
        </p>
      </div>

      <ol className="space-y-3 text-xs text-slate-700 leading-relaxed">
        <li className={passo}>
          <span className={num}>1</span>
          <div>
            <b>👥 Quem está apto a participar.</b> Os cargos que participam da campanha são os da tabela
            <b> Bônus-alvo - Serviços</b>, mais abaixo. É preciso estar com o cadastro <b>“1 - Trabalhando”</b> ou
            <b>“9 - Férias”</b> no menu Funcionários, sem data de demissão, e na empresa da campanha. Quem está de férias
            participa normalmente; outros afastamentos (doença, licença…) e demitidos não participam.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>2</span>
          <div>
            <b>🎯 Suas metas.</b> Cada cargo é avaliado pelos indicadores do <b>Bloco 3 - Serviços</b> da Matriz KPIs,
            com as metas aprovadas no Planejamento de Metas ou definidas na própria Matriz KPIs.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>3</span>
          <div>
            <b>📅 Apuração toda semana.</b> As semanas vão de domingo a sábado, as mesmas da Matriz KPIs (veja a tabela abaixo).
            Uma semana incompleta no começo ou no fim do mês só conta sozinha se tiver uma quarta-feira; senão, é somada à
            semana vizinha — por isso o mês poderá ter <b>4 ou 5 semanas</b>. Em cada semana é calculada a <b>soma da contribuição</b>, que será o valor extraído de contribuição de cada
            indicador que possuir valores de pesos.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>4</span>
          <div>
            <b>📊 Faixa de pagamento.</b> A contribuição da semana mostra em qual faixa você ficou, e cada faixa
            diz quanto do bônus você recebe — sobre a <b>Meta</b> ✅ ou, nas faixas mais altas, sobre a <b>Supermeta</b> 🚀.
            Por exemplo: se a sua contribuição na semana foi de 85% e a faixa de 80% a 90% paga 50% da Meta, você recebe
            50% do bônus da Meta naquela semana. As faixas do mês estão na tabela <b>Faixas de pagamento</b>, mais abaixo.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>5</span>
          <div>
            <b>💰 Valor da semana.</b> O bônus-alvo do mês (Meta ou Supermeta, tabela <b>Bônus-alvo - Serviços</b>) é dividido
            entre os blocos da Matriz KPIs — por exemplo, Bloco 1 - Corporativo 20%, Bloco 2 - Departamental 30% e
            Bloco 3 - Serviços 50%. As partes do Bloco 1 e do Bloco 2 são pagas <b>integralmente</b>, por mês. A parte do
            Bloco 3, dividida pela quantidade de semanas do mês, é o bônus-alvo da semana, e segue as faixas:
            bônus da semana = <b>% aplicado sobre o bônus × bônus-alvo da semana</b>.
          </div>
        </li>
        <li className={passo}>
          <span className={num}>6</span>
          <div>
            <b>➕ Pagamento.</b> O bônus é a <b>soma das semanas</b>. O valor acumulado
            é pago conforme a <b>forma de pagamento</b> definida nas Regras-chave: semanal, mensal, bimestral ou trimestral.
          </div>
        </li>
      </ol>

      <div className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700">
        <b>🧮 Exemplo:</b> Meta do mês R$ 1.500,00 → parte do Bloco 3 - Serviços (50%) = R$ 750,00 → em 5 semanas =
        R$ 150,00 por semana. Contribuição de 85% na semana → faixa que paga 50% da Meta → 50% × R$ 150,00 =
        <b> R$ 75,00</b> naquela semana.
      </div>

      {/* Item 7 fica abaixo do exemplo, mantendo a numeração dos passos. */}
      <div className={`${passo} text-xs text-slate-700 leading-relaxed`}>
        <span className={num}>7</span>
        <div>
          ⚠️ Quando ativada nas Regras-chave, as bonificações só são liberadas se o <b>% de atingimento do mês</b> alcançar o mínimo definido.
        </div>
      </div>
      </>)}
    </section>
  )
}

// Regras de uma empresa "zeradas": Regras-chave vazia e desligada; Bônus-alvo com Meta/Supermeta 0 e
// cadeado fechado nas duas (a linha continua aparecendo — ver linhasBonus); Faixas = nenhuma.
function regrasZeradas(regras, unidade, unidades) {
  let r = regras
  const travas = {}
  for (const l of linhasBonus(regras, unidade, unidades)) {
    r = comValor(r, l.meta, 0)
    if (l.supermeta) r = comValor(r, l.supermeta, 0)
    travas[`${l.k}:meta`] = true
    travas[`${l.k}:super`] = true
  }
  r = comValor(r, ['bonusBloqueado', unidade], travas)
  r = comValor(r, ['regrasChave', 'atingimentoMinimo'], { ativo: false, valor: null })
  r = comValor(r, ['faixasUnidade', unidade], [])
  return r
}

// Quadros do Bloco 3 da Matriz KPIs, por aba (mesmos títulos do backend: BLOCO3_PV/BLOCO_SERVICOS e
// BLOCO3_PECAS). Cada função do Bônus-alvo aponta para um quadro: regras.quadroLinha[unidade][linha] =
// { bloco: 'servicos' | 'pecas', quadro }. Sem escolha salva, vale o padrão da função.
const QUADROS_BLOCO3 = {
  servicos: ['CONSULTOR DE SERVIÇOS', 'MECÂNICO', 'CHEFE DE OFICINA', 'SETOR DE MECÂNICA', 'SETOR FUNILARIA/PINTURA', 'GERENTE GERAL PÓS-VENDAS', 'GERENTE DE SERVIÇO - CAMPO GRANDE',
    'GERENTE FILIAL - DOURADOS', 'GERENTE FILIAL - TRÊS LAGOAS', 'GERENTE FILIAL - CHAPADÃO DO SUL', 'GERENTE DE QUALIDADE'],
  pecas: ['GERENTE ATACADO PEÇAS', 'COORDENADOR ATACADO PEÇAS', 'VENDEDOR DE PEÇAS', 'GERENTE DE COMPRAS',
    'SUPERVISÃO DE PEÇAS/ENCARREGADO ESTOQUE', 'ESTOQUISTA/AUXILIAR PEÇAS'],
}
// Quadros que a Matriz consegue filtrar por pessoa (parâmetro do backend) — só neles existe "Individual".
const FILTRO_PESSOA = { 'CONSULTOR DE SERVIÇOS': 'consultor', 'MECÂNICO': 'mecanico', 'VENDEDOR DE PEÇAS': 'vendedor' }
// Configuração efetiva do quadro de uma linha: a salva ou o padrão; "individual" só vale se o quadro permitir.
// Quadros renomeados na Matriz: regras já salvas com o nome antigo continuam valendo.
const QUADRO_RENOMEADO = { 'OFICINA': 'SETOR DE MECÂNICA' }
function cfgQuadroDaLinha(regras, unidade, k) {
  const c = regras?.quadroLinha?.[unidade]?.[k] || quadroPadraoDaLinha(k, unidade)
  const quadro = QUADRO_RENOMEADO[c.quadro] || c.quadro || ''
  const podeIndividual = !!FILTRO_PESSOA[quadro]
  return { bloco: c.bloco || 'servicos', quadro, individual: podeIndividual && (c.individual ?? true) }
}
function quadroPadraoDaLinha(k, unidade) {
  if (k === 'consultor') return { bloco: 'servicos', quadro: 'CONSULTOR DE SERVIÇOS', individual: true }
  if (k === 'mecanico') return { bloco: 'servicos', quadro: 'MECÂNICO', individual: true }
  if (k === 'chefe' || k === 'gerente') {
    const u = CAMPANHA.unidades.find((x) => x.id === unidade)
    return u ? { bloco: 'servicos', quadro: String(u.quadroMatriz).toUpperCase() } : { bloco: 'servicos', quadro: '' }
  }
  if (k.startsWith('gg-')) return { bloco: 'servicos', quadro: 'GERENTE GERAL PÓS-VENDAS' }
  return { bloco: 'servicos', quadro: '' }
}

// Cargos padrão de uma linha do Bônus-alvo (quando ainda não há lista salva) — a regra antiga de cada função.
function cargosPadraoDaLinha(k, regras, unidade, cargosLista) {
  const F = regras.funcoes || {}
  const nomes = (filtro) => [...new Set((cargosLista || []).filter(filtro).map((c) => normNome(c.nome_cargo)))]
  if (k === 'consultor') return nomes((c) => c.nome_agrupamento_cargo === CAMPANHA.funcoes.consultor.agrupamentoCargo)
  if (k === 'mecanico') return Array.isArray(F.mecanico?.cargos) ? F.mecanico.cargos : nomes((c) => normNome(c.nome_cargo).startsWith('MECANICO'))
  if (k === 'chefe' || k === 'gerente') return F[k]?.cargos?.[unidade] || []
  if (k.startsWith('gg-')) return F.gerenteGeral?.cargos || []
  return []
}

// Editor de cargos de uma linha do Bônus-alvo (ou de um grupo novo): descrição e cálculo (só grupos
// criados) + cargos do menu Cargos (busca + marcar/desmarcar). Só altera o rascunho — vale no Salvar.
function EditorCargos({ cargosLista, empresaPadrao = '', quadroInicial, novo, linha, grupo, selecionados, onCancelar, onSalvar, onRemover }) {
  // Quadro do Bloco 3 da Matriz KPIs que dá os valores da Apuração/Resultado desta função.
  const bloco = 'servicos' // só o Bloco 3 - Serviços
  const [quadro, setQuadro] = useState(quadroInicial?.quadro || '')
  const [individual, setIndividual] = useState(!!quadroInicial?.individual)
  const podeIndividual = !!FILTRO_PESSOA[quadro]
  const [nome, setNome] = useState(grupo?.nome || linha?.nome || '')
  const [marcados, setMarcados] = useState(() => new Set((selecionados || []).map(normNome)))
  const [busca, setBusca] = useState('')
  // Filtro de empresa (só para encontrar os cargos; a seleção vale pelo nome do cargo).
  const [empresa, setEmpresa] = useState(empresaPadrao || '')
  const empresas = useMemo(() => {
    const m = new Map()
    for (const c of cargosLista || []) if (c.empresa_id && !m.has(c.empresa_id)) m.set(c.empresa_id, c.nome_empresa || 'Sem nome')
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [cargosLista])
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCancelar() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancelar])
  // Cargos do menu Cargos sem repetir o nome (o mesmo cargo pode existir em várias empresas).
  const opcoes = useMemo(() => {
    const m = new Map()
    for (const c of cargosLista || []) {
      if (empresa && c.empresa_id !== empresa) continue
      const k = normNome(c.nome_cargo)
      if (k && !m.has(k)) m.set(k, { k, nome: c.nome_cargo, agrupamento: c.nome_agrupamento_cargo })
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [cargosLista, empresa])
  const termo = normNome(busca)
  // Marcados primeiro (em ordem alfabética), depois os demais.
  const visiveis = opcoes
    .filter((o) => !termo || o.k.includes(termo) || normNome(o.agrupamento).includes(termo))
    .sort((a, b) => (marcados.has(b.k) - marcados.has(a.k)) || a.nome.localeCompare(b.nome))
  const alternar = (k) => setMarcados((x) => { const n = new Set(x); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const podeSalvar = !!nome.trim() && marcados.size > 0
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar() }}>
      <div role="dialog" aria-modal="true" aria-label="Cargos da função" className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900">{novo ? 'Adicionar cargo' : `Editar — ${linha?.nome}`}</p>
          <button type="button" onClick={onCancelar} aria-label="Fechar" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-auto">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Descrição</span>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lavadores"
              className="mt-1 w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </label>
          {/* Bloco 3 da Matriz KPIs: de onde vêm os valores da Apuração e do Resultado desta função. */}
          <div className="text-xs space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <span className="block font-semibold text-slate-700">Bloco 3 - Serviços (Matriz KPIs)</span>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Quadro do Bloco 3" value={quadro}
                onChange={(e) => { setQuadro(e.target.value); setIndividual(!!FILTRO_PESSOA[e.target.value]) }}
                className="flex-1 min-w-[12rem] text-xs p-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Selecione o quadro…</option>
                {(QUADROS_BLOCO3[bloco] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className={`inline-flex items-center gap-2 ${podeIndividual ? 'text-slate-700' : 'text-slate-400'}`}
              title={podeIndividual ? 'Valores buscados na Matriz pelo nome de cada pessoa' : 'Este quadro não tem valor por pessoa na Matriz — usa o total do quadro'}>
              <input type="checkbox" checked={podeIndividual && individual} disabled={!podeIndividual} onChange={(e) => setIndividual(e.target.checked)} className="h-3.5 w-3.5" />
              <span><b>Individual</b> — valores da Apuração buscados pelo nome de cada pessoa (desmarcado: total do quadro para todos)</span>
            </label>
          </div>
          <div className="text-xs">
            {/* Empresa e, logo abaixo, a busca — cada um na largura toda. */}
            <div className="space-y-2">
              <span className="block font-semibold text-slate-700">Cargos que fazem parte ({marcados.size})</span>
              <select aria-label="Filtrar cargos por empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Todas as empresas</option>
                {empresas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
              </select>
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cargo ou agrupamento…"
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="mt-2 max-h-72 overflow-auto rounded-md border border-slate-200 divide-y divide-slate-100">
              {visiveis.map((o) => (
                <label key={o.k} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={marcados.has(o.k)} onChange={() => alternar(o.k)} className="h-3.5 w-3.5" />
                  <span className="text-slate-800">{o.nome}</span>
                  {o.agrupamento && <span className="ml-auto text-[10px] text-slate-400">{o.agrupamento}</span>}
                </label>
              ))}
              {!visiveis.length && <p className="px-3 py-3 text-slate-500">Nenhum cargo encontrado.</p>}
            </div>
            {(() => {
              const fora = [...marcados].filter((k) => !opcoes.some((o) => o.k === k)).length
              return fora > 0 && <p className="mt-1.5 text-[11px] text-amber-700">{fora} cargo(s) marcado(s) de outra empresa (não aparecem neste filtro, mas continuam marcados).</p>
            })()}
            <p className="mt-1.5 text-[11px] text-slate-500">Aparecem na Apuração as pessoas “1 - Trabalhando” ou “9 - Férias” da empresa com esses cargos.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200">
          {onRemover ? (
            <button type="button" onClick={onRemover} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Remover grupo
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancelar} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50">Cancelar</button>
            <button type="button" disabled={!podeSalvar} onClick={() => onSalvar({ nome: nome.trim(), cargos: [...marcados], quadro: { bloco, quadro, individual: podeIndividual && individual } })}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {novo ? 'Adicionar' : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Seletor liga/desliga (ex.: "Considerar" a regra-chave no cálculo).
function Interruptor({ ligado, onChange, rotulo }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} aria-label={rotulo} title={ligado ? 'Considerada no cálculo' : 'Não considerada'}
      onClick={() => onChange(!ligado)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${ligado ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

// Regra-chave "atingimento mínimo do mês" (aba Regras): ligada e com o atingimento do mês abaixo do
// mínimo (ou sem atingimento calculado), nenhuma semana é liberada.
function bloqueioAtingimentoMinimo(regras, totalMes) {
  const r = regras?.regrasChave?.atingimentoMinimo
  if (!r?.ativo) return null
  const minimo = Number(r.valor) || 0
  if (totalMes != null && totalMes >= minimo) return null
  return `Bonificações não liberadas: atingimento do mês ${totalMes == null ? '—' : pctTxt(totalMes)} abaixo do mínimo de ${pctTxt(minimo)} (Regras-chave)`
}

// Botão de engrenagem com um menu de ações (fecha ao clicar fora ou Esc).
// flutuante: menu aberto por cima da página, alinhado à esquerda do botão (dentro de tabela com
// rolagem, o menu comum ficaria cortado). Fecha ao rolar a página.
function MenuEngrenagem({ itens, flutuante = false, titulo = 'Mais ações', compacto = false }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setAberto(false)
    }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    const rolou = () => setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    if (flutuante) window.addEventListener('scroll', rolou, true)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', rolou, true)
    }
  }, [aberto, flutuante])
  if (!itens.length) return null // nenhuma ação liberada para o grupo: sem engrenagem
  const alternar = () => {
    if (!aberto && flutuante && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setAberto((v) => !v)
  }
  const menu = (
    <div ref={menuRef} role="menu"
      className={`${flutuante ? 'fixed z-50 w-44' : 'absolute right-0 top-full mt-1 z-30 w-64'} rounded-lg border border-slate-200 bg-white shadow-lg py-1`}
      style={flutuante && pos ? { top: pos.top, left: pos.left } : undefined}>
      {itens.map(({ rotulo, icone: Icone, onClick, desabilitado, dica, perigo }) => (
        <button key={rotulo} type="button" role="menuitem" disabled={desabilitado} title={dica}
          onClick={() => { setAberto(false); onClick() }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left disabled:opacity-50 ${perigo ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}>
          <Icone className={`h-3.5 w-3.5 ${perigo ? 'text-red-500' : 'text-slate-500'} ${desabilitado ? 'animate-spin' : ''}`} /> {rotulo}
        </button>
      ))}
    </div>
  )
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={alternar} aria-expanded={aberto} aria-haspopup="menu"
        title={titulo} aria-label={titulo}
        className={`inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 ${compacto ? 'h-7 w-7' : 'p-1.5'}`}>
        <Settings className={compacto ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      {aberto && (flutuante ? createPortal(menu, document.body) : menu)}
    </div>
  )
}

function AbaRegras({ onSalvarMes, cargosLista = [], travaPeriodicidade = null, permRegras = {}, onSalvarOutra, slotAcoes, campanha, unidade, semCalendario, nomeMes, ano, mes, regras, onSalvar, origemRegras, nomeEmpresa }) {
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
    return v // só o valor digitado (sem preencher 120% da Meta automaticamente)
  }
  const alterar = (caminho, v) => { setRascunho((r) => comValor(r, caminho, v)); setMsg(null) }
  // Bônus-alvo é do mês: por semana = valor ÷ nº de semanas do mês (5 semanas ÷ 5, 4 semanas ÷ 4).
  const nSemanas = campanha.semanas.length || 1
  const porSemana = (v) => `R$ ${moedaTxt((Number(v) || 0) / nSemanas)}`
  // Cargos de cada linha do Bônus-alvo (quem participa). Sem lista salva, mostra a regra padrão da função.
  const [editorCargos, setEditorCargos] = useState(null) // { linha } | { novo: true }
  // Quadro do Bloco 3 (Matriz KPIs) de cada linha: Serviços ou Peças + o quadro (ex.: CONSULTOR DE SERVIÇOS).
  const quadroDaLinha = (l) => cfgQuadroDaLinha(rascunho, unidade, l.k)
  // Empresa da tela (filtro de empresa do editor de cargos abre nela); CAIOBÁ TRUCKS = todas.
  const empresaIdTela = campanha.unidades.find((x) => x.id === unidade)?.empresaId || ''
  const cargosDaLinha = (l) => {
    const salvo = lerCaminho(rascunho, l.cargos)
    if (Array.isArray(salvo)) return salvo
    return cargosPadraoDaLinha(l.k, rascunho, unidade, cargosLista)
  }
  const salvarCargos = (ed, { nome, cargos, quadro }) => {
    if (ed.novo) {
      const k = `g${Date.now().toString(36)}`
      alterar(['gruposBonus', unidade, k], { nome, cargos, meta: 0, supermeta: null })
      alterar(['quadroLinha', unidade, k], quadro)
      return
    }
    alterar(['quadroLinha', unidade, ed.linha.k], quadro)
    if (ed.linha.grupo) {
      const atual = rascunho.gruposBonus?.[unidade]?.[ed.linha.k] || {}
      alterar(['gruposBonus', unidade, ed.linha.k], { ...atual, nome, cargos })
      return
    }
    alterar(ed.linha.cargos, cargos)
    if (nome && nome !== ed.linha.nome) alterar(['nomesLinha', unidade, ed.linha.k], nome)
  }
  // Copiar para os próximos meses do período: no 1º mês de um bimestre/trimestre, grava as regras da
  // tela (todas: Regras-chave, Bônus-alvo, Faixas, cargos) neste mês e nos meses seguintes do período,
  // para esta empresa. Depois cada mês pode ser ajustado à parte.
  const [copiandoPeriodo, setCopiandoPeriodo] = useState(false)
  const periodicidadeTela = travaPeriodicidade ? travaPeriodicidade.periodicidade : periodicidadeDe(rascunho)
  const mesesSeguintes = !travaPeriodicidade && ['bimestral', 'trimestral'].includes(periodicidadeTela)
    ? mesesDoPeriodo(periodicidadeTela, mes).filter((m) => m !== Number(mes)) : []
  const rotuloMeses = (ms) => ms.map((x) => MESES[x - 1]?.label.slice(0, 3).toUpperCase()).join('/')
  const copiarParaPeriodo = async () => {
    if (!mesesSeguintes.length) return
    const nomes = mesesSeguintes.map((x) => `${MESES[x - 1]?.label}/${ano}`).join(' e ')
    if (!window.confirm(`Copiar TODAS as regras desta tela (${nomeMes}/${ano}) para ${nomes} de ${nomeEmpresa}?\n\nIsso grava ${nomeMes} e substitui as regras já salvas nesses meses. Depois você pode ajustar cada mês separadamente.`)) return
    setCopiandoPeriodo(true)
    setMsg(null)
    try {
      await onSalvar(rascunho) // grava o mês atual junto, para os três ficarem iguais
      for (const m of mesesSeguintes) await onSalvarMes(m, rascunho)
      setMsg({ erro: false, txt: `Regras de ${nomeMes} copiadas para ${nomes}.` })
    } catch (err) {
      setMsg({ erro: true, txt: `Não foi possível copiar: ${err.message || err}` })
    } finally {
      setCopiandoPeriodo(false)
    }
  }

  // Excluir uma linha do Bônus-alvo: grupo criado é apagado; função fixa é marcada como removida
  // (some da tabela e da Apuração/Resultado/Pagamento desta empresa e mês). Vale depois de Salvar.
  const excluirLinha = (l) => {
    if (!window.confirm(`Excluir a função "${l.nome}" e as metas dela do Bônus-alvo?\n\nEla deixa de aparecer na Apuração, no Resultado e no Pagamento desta empresa (${nomeMes}/${ano}). Clique em Salvar para gravar.`)) return
    if (l.grupo) { removerGrupo(l.k); return }
    alterar(['linhasRemovidas', unidade, l.k], true)
  }
  const removerGrupo = (k) => {
    const resto = { ...(rascunho.gruposBonus?.[unidade] || {}) }
    delete resto[k]
    alterar(['gruposBonus', unidade], resto)
  }
  // Divisão do bônus entre os blocos (Bloco 1/2/3 da Matriz) — precisa somar 100%.
  const pb = rascunho.pesosBlocos || {}
  const somaBlocos = (Number(pb.companhia) || 0) + (Number(pb.departamento) || 0) + (Number(pb.individual) || 0)
  const somaBlocosOk = Math.abs(somaBlocos - 1) < 0.0001
  // Células B1, B2 e B3 de Meta/Supermeta: valor do mês (parte do bloco) e, embaixo, por semana.
  const BLOCOS_BONUS = [['companhia', 'B1'], ['departamento', 'B2'], ['individual', 'B3']]
  const celulasBlocos = (v) => BLOCOS_BONUS.map(([k, rot]) => {
    const cls = `p-2 text-right tabular-nums whitespace-nowrap ${k === 'individual' ? 'text-blue-800 bg-blue-50/40' : 'text-slate-600'}`
    if (v == null) return <td key={k} className={cls}>—</td>
    const parte = (Number(v) || 0) * (Number(pb[k]) || 0)
    return (
      <td key={k} className={cls} title={`${rot} (${pctTxt(Number(pb[k]) || 0)})`}>
        R$ {moedaTxt(parte)}
        {k === 'individual' && <span className="block text-[10px] text-slate-400">R$ {moedaTxt(parte / nSemanas)}/sem</span>}
      </td>
    )
  })
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

  // Zerar valores (aba inteira desta empresa), só no rascunho — vale depois de Salvar:
  //   Regras-chave: sem valor e "Considerar" desligado;
  //   Bônus-alvo: Meta e Supermeta = 0 e cadeado FECHADO nas duas (linha continua aparecendo — ver
  //               linhasBonus: linha com trava registrada não some com valor 0);
  //   Faixas de pagamento: nenhuma faixa.
  const zerarValores = () => {
    setRascunho(regrasZeradas(rascunho, unidade, campanha.unidades))
    setMsg({ erro: false, txt: 'Valores zerados — clique em Salvar para gravar.' })
  }

  // Zerar valores de TODAS as empresas (CG, DOU, TL, CS e CAIOBÁ TRUCKS) no mês/ano selecionado:
  // mesma limpeza do "Zerar valores", já GRAVADA em cada empresa (pede confirmação). Outros meses
  // não são afetados.
  const [zerandoTodas, setZerandoTodas] = useState(false)
  const zerarTodas = async () => {
    const empresas = [...campanha.unidades.map((x) => ({ id: x.id, nome: x.nome })), { id: 'TRUCKS', nome: 'CAIOBÁ TRUCKS' }]
    if (!window.confirm(`Zerar Regras-chave, Bônus-alvo e Faixas de TODAS as empresas (${empresas.map((x) => x.nome).join(', ')}) em ${nomeMes}/${ano}?\n\nOs valores são apagados e gravados na hora. Outros meses não são afetados.`)) return
    setZerandoTodas(true)
    setMsg(null)
    try {
      for (const e of empresas) {
        if (e.id === unidade) continue
        const linha = await apiService.getCampanhaRegras(Number(ano), Number(mes), e.id)
        await onSalvarOutra(e.id, regrasZeradas(mesclarRegras(REGRAS_PADRAO, linha?.dados), e.id, campanha.unidades))
      }
      // A empresa aberta grava pelo Salvar normal (atualiza a tela junto).
      await onSalvar(regrasZeradas(rascunho, unidade, campanha.unidades))
      setMsg({ erro: false, txt: `Valores zerados e salvos em todas as empresas (${nomeMes}/${ano}).` })
    } catch (err) {
      setMsg({ erro: true, txt: `Não foi possível zerar todas: ${err.message || err}` })
    } finally {
      setZerandoTodas(false)
    }
  }

  // Copiar do mês anterior: traz as regras gravadas desta empresa no mês anterior (Bônus-alvo,
  // travas e Faixas). Sem nada salvo nesse mês, avisa. Vale depois de Salvar.
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

  // Copiar valores para todas as empresas: pega o que está na tela desta empresa (mesmo sem salvar) —
  // Regras-chave, Bônus-alvo (Meta, Supermeta e cadeados de cada função) e Faixas — e GRAVA nas demais
  // empresas do mesmo mês/ano, mantendo o resto das regras de cada uma. Esta empresa continua
  // precisando do Salvar. CAIOBÁ TRUCKS fica de fora (só tem o Gerente Geral, com bônus por unidade).
  const [copiandoTodas, setCopiandoTodas] = useState(false)
  const outrasEmpresas = campanha.unidades.filter((x) => x.id !== unidade)
  const copiarParaTodas = async () => {
    const nomes = outrasEmpresas.map((x) => x.nome).join(', ')
    if (!window.confirm(`Copiar Regras-chave, Bônus-alvo e Faixas desta tela para ${nomes} em ${nomeMes}/${ano}?\n\nIsso substitui esses valores já salvos nessas empresas.`)) return
    setCopiandoTodas(true)
    setMsg(null)
    try {
      const funcoes = ['consultor', 'mecanico', 'box', 'prog', 'gerente']
      const travasOrigem = rascunho.bonusBloqueado?.[unidade] || {}
      for (const destino of outrasEmpresas) {
        const linha = await apiService.getCampanhaRegras(Number(ano), Number(mes), destino.id)
        let r = mesclarRegras(REGRAS_PADRAO, linha?.dados)
        for (const k of funcoes) {
          if (!rascunho.funcoes?.[k]) continue
          r = comValor(r, ['funcoes', k, 'alvo', destino.id], rascunho.funcoes[k].alvo?.[unidade] ?? 0)
          const sup = rascunho.funcoes[k].supermeta?.[unidade]
          if (sup !== undefined) r = comValor(r, ['funcoes', k, 'supermeta', destino.id], sup)
        }
        if (rascunho.funcoes?.chefe?.valores) r = comValor(r, ['funcoes', 'chefe', 'valores'], rascunho.funcoes.chefe.valores)
        r = comValor(r, ['bonusBloqueado', destino.id], travasOrigem)
        r = comValor(r, ['regrasChave'], rascunho.regrasChave || {})
        if (rascunho.pesosBlocos) r = comValor(r, ['pesosBlocos'], rascunho.pesosBlocos)
        if (rascunho.gruposBonus?.[unidade]) r = comValor(r, ['gruposBonus', destino.id], rascunho.gruposBonus[unidade])
        r = comValor(r, ['faixasUnidade', destino.id], faixasDe(rascunho, unidade) || [])
        await onSalvarOutra(destino.id, r)
      }
      setMsg({ erro: false, txt: `Copiado e salvo em ${nomes} (${nomeMes}/${ano}).${alterado ? ' Esta empresa ainda precisa de Salvar.' : ''}` })
    } catch (err) {
      setMsg({ erro: true, txt: `Não foi possível copiar para todas: ${err.message || err}` })
    } finally {
      setCopiandoTodas(false)
    }
  }

  // Salvar/Descartar gravam todas as regras da aba de uma vez (Bônus-alvo e Faixas). Ficam na linha
  // das abas (slotAcoes, via portal), com a engrenagem de Zerar valores / Copiar do mês anterior.
  // Mesmo Salvar do topo, no título de cada tabela editável (grava a aba inteira desta empresa/mês).
  const salvarNaTabela = permRegras.editar && (
    <button type="button" onClick={salvar} disabled={salvando || !alterado}
      title={salvando ? 'Salvando…' : alterado ? 'Salvar' : 'Nada para salvar'} aria-label="Salvar"
      className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-40">
      {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
    </button>
  )

  const botoesSalvar = (
    <div className="flex items-center gap-2">
      {msg && <span className={`text-xs ${msg.erro ? 'text-red-600' : 'text-emerald-700'}`}>{msg.txt}</span>}
      {permRegras.editar && alterado && (
        // Só ícones (lixeira = Descartar, disquete = Salvar); o nome aparece ao passar o mouse.
        <button type="button" onClick={() => { setRascunho(regras); setMsg(null) }} title="Descartar" aria-label="Descartar"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {permRegras.editar && <button type="button" onClick={salvar} disabled={salvando || !alterado}
        title={salvando ? 'Salvando…' : 'Salvar'} aria-label="Salvar"
        className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50">
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </button>}
      <MenuEngrenagem itens={[
        {
          permitido: permRegras.zerar && permRegras.editar,
          rotulo: 'Zerar valores (só esta empresa)', icone: Eraser, onClick: zerarValores,
          dica: `Limpa Regras-chave, Bônus-alvo (cadeados fechados) e Faixas desta empresa só em ${nomeMes}/${ano}`,
        },
        {
          permitido: permRegras.zerarTodas,
          rotulo: 'Zerar valores de todas as empresas', icone: zerandoTodas ? Loader2 : Eraser, onClick: zerarTodas,
          desabilitado: zerandoTodas,
          dica: `Zera e grava todas as empresas só em ${nomeMes}/${ano}`,
        },
        { permitido: permRegras.copiarMes && permRegras.editar, rotulo: 'Copiar do mês anterior (só esta empresa)', icone: copiando ? Loader2 : Copy, onClick: copiarMesAnterior, desabilitado: copiando, dica: `Copiar as regras de ${nomeMesAnterior} desta empresa` },
        {
          permitido: permRegras.copiarTodas,
          rotulo: 'Copiar valores para todas as empresas', icone: copiandoTodas ? Loader2 : CopyPlus, onClick: copiarParaTodas,
          desabilitado: copiandoTodas || unidade === 'TRUCKS',
          dica: unidade === 'TRUCKS'
            ? 'Disponível nas abas das empresas (CAIOBÁ TRUCKS tem só o Gerente Geral)'
            : `Grava Regras-chave, Bônus-alvo e Faixas desta tela em ${outrasEmpresas.map((x) => x.nome).join(', ')} — ${nomeMes}/${ano}`,
        },
      ].filter((it) => it.permitido)} />
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
      <ComoFunciona />
      {!permRegras.editar && (
        <p className="text-xs text-slate-500">🔒 Somente visualização — seu grupo de acesso não pode editar as regras.</p>
      )}
      {/* Bloco normal (não "contents"): assim o espaçamento entre os quadros da aba funciona. */}
      <fieldset disabled={!permRegras.editar} className="space-y-5 min-w-0">
    <div className="grid grid-cols-1 gap-5">
    {/* Semanas e Regras-chave lado a lado; Bônus-alvo e Faixas abaixo. */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
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
                    Sem {s.id.slice(1)}
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

      {/* Regras-chave: condições que liberam (ou não) as bonificações. Cada uma tem um seletor
          "Considerar" — desligada, não entra no cálculo. Gravadas em regras.regrasChave. */}
      <section className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">Regras-chave</h2>
          {salvarNaTabela}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className={`${TH} text-left`}>Regra</th>
                <th className={`${TH} text-left`}>Valor</th>
                <th className={`${TH} text-center w-28`}>Considerar</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const r = rascunho.regrasChave?.atingimentoMinimo || {}
                const ativo = !!r.ativo
                return (
                  <tr className="border-b border-slate-100 last:border-0">
                    <td className={`p-2 ${ativo ? 'text-slate-700' : 'text-slate-400'}`}>
                      Para liberar as bonificações semanais, o <b>% de atingimento do mês</b> precisa ser de no mínimo
                    </td>
                    <td className="p-1.5 text-left">
                      <span className={`inline-flex items-center gap-1 ${ativo ? '' : 'opacity-50 pointer-events-none'}`}>
                        <PctInput rotulo="% de atingimento mínimo para liberar as bonificações" value={r.valor}
                          onChange={(v) => alterar(['regrasChave', 'atingimentoMinimo', 'valor'], v)} />
                        <button type="button" onClick={() => alterar(['regrasChave', 'atingimentoMinimo', 'valor'], null)}
                          title="Limpar valor" aria-label="Limpar o % de atingimento mínimo"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <Interruptor ligado={ativo} rotulo="Considerar a regra de atingimento mínimo"
                        onChange={(v) => alterar(['regrasChave', 'atingimentoMinimo', 'ativo'], v)} />
                    </td>
                  </tr>
                )
              })()}
              {/* Periodicidade do pagamento (aba Pagamento): o bônus continua apurado por semana; aqui
                  só se define de quanto em quanto tempo o acumulado é pago — sem regra extra de
                  liberação do acumulado. Gravado em regrasChave.periodicidadePagamento. */}
              <tr className="border-b border-slate-100 last:border-0">
                <td className="p-2 text-slate-700">
                  <b>Forma de pagamento</b> do bônus
                  {travaPeriodicidade && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Definido em {MESES[travaPeriodicidade.mesOrigem - 1]?.label} (1º mês do {travaPeriodicidade.periodicidade === 'trimestral' ? 'trimestre' : 'bimestre'})
                    </span>
                  )}
                </td>
                <td className="p-1.5 text-left">
                  {/* Só o mês de ORIGEM escolhe: Trimestral só em jan/abr/jul/out, Bimestral só em
                      jan/mar/mai/jul/set/nov. Meses seguintes de um período ficam travados. */}
                  <span className="inline-flex flex-col items-start gap-0.5">
                    <span className="inline-flex items-center gap-1">
                      <select aria-label="Periodicidade do pagamento" disabled={!!travaPeriodicidade}
                        value={travaPeriodicidade ? travaPeriodicidade.periodicidade : periodicidadeDe(rascunho)}
                        onChange={(e) => alterar(['regrasChave', 'periodicidadePagamento'], e.target.value)}
                        className="w-24 text-xs p-1.5 border border-slate-200 rounded bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                        {PERIODICIDADES.map((p) => {
                          const mm = Number(mes)
                          const foraDaOrigem = !travaPeriodicidade && ((p.v === 'trimestral' && inicioTrimestre(mm) !== mm) || (p.v === 'bimestral' && inicioBimestre(mm) !== mm))
                          return <option key={p.v} value={p.v} disabled={foraDaOrigem}>{p.label}</option>
                        })}
                      </select>
                    </span>
                  </span>
                </td>
                <td className="p-2 text-center">
                  <span className="inline-flex items-center gap-1">
                    {/* Meses que fazem parte do período escolhido, ex.: OUT/NOV/DEZ */}
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 whitespace-nowrap"
                      title="Meses que fazem parte deste período de pagamento">
                      {mesesDoPeriodo(travaPeriodicidade ? travaPeriodicidade.periodicidade : periodicidadeDe(rascunho), mes)
                        .map((x) => MESES[x - 1]?.label.slice(0, 3).toUpperCase()).join('/')}
                    </span>
                    {travaPeriodicidade && <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                    {mesesSeguintes.length > 0 && (
                      <button type="button" onClick={copiarParaPeriodo} disabled={copiandoPeriodo}
                        title={`Copiar todas as regras desta tela para ${rotuloMeses(mesesSeguintes)} (depois dá para ajustar mês a mês)`}
                        aria-label={`Copiar todas as regras para ${rotuloMeses(mesesSeguintes)}`}
                        className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                        {copiandoPeriodo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

      <section className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-900">Bônus-alvo - Serviços</h2>
        </div>
        {/* Divisão do bônus entre os blocos da Matriz (iguais para todas as funções; gravado em
            regras.pesosBlocos). A parte de cada bloco é a base de cálculo daquele bloco — hoje só o
            Bloco 3 tem dados (Resultado e Pagamento usam a parte do Bloco 3). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Divisão do bônus:</span>
          {[['companhia', 'Bloco 1 - Corporativo'], ['departamento', 'Bloco 2 - Departamental'], ['individual', 'Bloco 3 - Serviços']].map(([k, rot]) => (
            <label key={k} className="inline-flex items-center gap-1.5">
              <span>{rot}</span>
              <PctInput rotulo={`% do bônus para o ${rot}`} value={rascunho.pesosBlocos?.[k] ?? 0}
                onChange={(v) => alterar(['pesosBlocos', k], v)} />
            </label>
          ))}
          <span className={`font-semibold ${somaBlocosOk ? 'text-emerald-700' : 'text-red-600'}`}>
            = {pctTxt(somaBlocos)} {somaBlocosOk ? '✔' : '(precisa somar 100%)'}
          </span>
        </div>
        {linhas.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma função com bônus nesta empresa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <th rowSpan={2} className={`${TH} w-9 align-bottom border-b border-slate-200`} aria-label="Excluir" />
                  <th rowSpan={2} className={`${TH} text-left align-bottom border-b border-slate-200`}>Função</th>
                  <th colSpan={4} className={`${TH} text-center border-l border-slate-200`}>Meta</th>
                  <th colSpan={4} className={`${TH} text-center border-l border-slate-200`}>Supermeta</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['meta', 'super'].map((g) => (
                    <React.Fragment key={g}>
                      <th className={`${TH} text-right border-l border-slate-200`} title="Valor do mês">Total</th>
                      {BLOCOS_BONUS.map(([k, rot]) => (
                        <th key={k} className={`${TH} text-right ${k === 'individual' ? 'bg-blue-50/60' : ''}`} title={k === 'individual' ? `Parte do ${rot} (mês e, embaixo, ÷ ${nSemanas} semanas)` : `Parte do ${rot} no mês (paga integralmente)`}>{rot}</th>
                      ))}
                    </React.Fragment>
                  ))}
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
                      <td className="p-1.5 text-center">
                        <MenuEngrenagem flutuante compacto titulo={`Ações — ${l.nome}`} itens={[
                          { rotulo: 'Editar', icone: Pencil, onClick: () => setEditorCargos({ linha: l }), dica: 'Editar descrição, quadro do Bloco 3 e cargos desta função' },
                          { rotulo: 'Excluir', icone: Trash2, perigo: true, onClick: () => excluirLinha(l), dica: `Excluir a função "${l.nome}" e as metas dela` },
                        ]} />

                      </td>
                      <td className={`p-2 font-medium whitespace-nowrap ${metaTravada ? 'text-slate-400' : 'text-slate-700'}`}>
                        {l.nome}
                        {l.cargos && (
                          <button type="button" onClick={() => setEditorCargos({ linha: l })}
                            title={`Cargos que fazem parte de "${l.nome}": ${cargosDaLinha(l).join(', ') || 'nenhum'}`}
                            className="ml-2 inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-700">
                            <Users className="h-3 w-3" /> Cargos ({cargosDaLinha(l).length})
                          </button>
                        )}
                        {/* Bloco/quadro da Matriz KPIs desta função (escolhido na janela de Cargos). */}
                        {(() => {
                          const q = quadroDaLinha(l)
                          return (
                            <span className={`block text-[10px] font-normal ${q.quadro ? 'text-slate-400' : 'text-amber-600'}`}>
                              {q.quadro ? `Bloco 3 - Serviços / ${nomeProprio(q.quadro)}${q.individual ? ' · individual' : ''}` : 'Sem quadro do Bloco 3'}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="p-1.5 text-right border-l border-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          <Cadeado travado={metaTravada} rotulo={`Meta — ${l.nome}`} onClick={() => travar('meta', !metaTravada)}
                            dica={metaTravada ? 'Destravar a Meta (a Supermeta também é destravada)' : 'Travar a Meta sem valor (a Supermeta também é travada)'} />
                          <MoedaInput rotulo={`Meta — ${l.nome}`} vazio={metaTravada} disabled={metaTravada}
                            value={lerCaminho(rascunho, l.meta) ?? 0} onChange={(v) => alterar(l.meta, v)} />
                        </span>
                      </td>
                      {celulasBlocos(metaTravada ? null : lerCaminho(rascunho, l.meta))}
                      <td className="p-1.5 text-right border-l border-slate-100">
                        {l.supermeta && (
                          <span className="inline-flex items-center gap-1.5">
                            <Cadeado travado={superTravada} rotulo={`Supermeta — ${l.nome}`} desabilitado={metaTravada}
                              onClick={() => travar('super', !superTravada)}
                              dica={metaTravada ? 'Travada junto com a Meta' : superTravada ? 'Destravar a Supermeta' : 'Travar a Supermeta sem valor'} />
                            <MoedaInput rotulo={`Supermeta — ${l.nome}`} vazio={superTravada} disabled={superTravada}
                              value={valorSuper(l)} onChange={(v) => alterar(l.supermeta, v)} />
                          </span>
                        )}
                      </td>
                      {celulasBlocos(!l.supermeta || superTravada ? null : valorSuper(l))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Novo grupo de cargos (não existe em CAIOBÁ TRUCKS, que só tem o Gerente Geral). */}
        <div className="flex items-center gap-2">
          {unidade !== 'TRUCKS' && (
            <button type="button" onClick={() => setEditorCargos({ novo: true })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100">
              <Plus className="h-3.5 w-3.5" /> Adicionar cargo
            </button>
          )}
          {salvarNaTabela}
        </div>
      </section>
    </div>
      {editorCargos && (
        <EditorCargos cargosLista={cargosLista} empresaPadrao={empresaIdTela} novo={!!editorCargos.novo}
          quadroInicial={editorCargos.linha ? quadroDaLinha(editorCargos.linha) : { bloco: 'servicos', quadro: '', individual: false }} linha={editorCargos.linha || null}
          grupo={editorCargos.linha?.grupo ? rascunho.gruposBonus?.[unidade]?.[editorCargos.linha.k] : null}
          selecionados={editorCargos.linha ? cargosDaLinha(editorCargos.linha) : []}
          onCancelar={() => setEditorCargos(null)}
          onRemover={editorCargos.linha?.grupo ? () => { removerGrupo(editorCargos.linha.k); setEditorCargos(null) } : null}
          onSalvar={(dados) => { salvarCargos(editorCargos, dados); setEditorCargos(null) }} />
      )}

      <section className={`${CARD} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-900">Faixas de pagamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className={`${TH} w-10`} aria-label="Remover" />
                <th className={`${TH} text-left`}>Atingimento ≥</th>
                <th className={`${TH} text-left`}>e menor que</th>
                <th className={`${TH} text-left`}>% aplicado sobre o bônus</th>
                <th className={`${TH} text-left`}>Aplicar sobre</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 text-slate-500">
                <td className="p-2" />
                <td className="p-2">—</td>
                <td className="p-2 tabular-nums">&lt; {faixas.length ? pctTxt(faixas[0].min) : '—'}</td>
                <td className="p-2 tabular-nums">0,00%</td>
                <td className="p-2" />
              </tr>
              {faixas.map((f, i) => {
                const prox = faixas[i + 1]
                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-1.5 text-center">
                      <button type="button" onClick={() => removerFaixa(f.id)} disabled={faixas.length <= 1}
                        title="Remover esta faixa" aria-label={`Remover faixa a partir de ${pctTxt(f.min)}`}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={adicionarFaixa}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100">
            <Plus className="h-3.5 w-3.5" /> Adicionar faixa
          </button>
          {salvarNaTabela}
        </div>
      </section>
      </fieldset>
    </div>
  )
}
