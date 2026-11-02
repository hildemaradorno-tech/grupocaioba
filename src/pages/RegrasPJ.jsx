import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, AlertTriangle, Briefcase, Loader2, Paperclip } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import AcoesDropdown from '../components/AcoesDropdown'
import FiltroMultiSelect from '../components/FiltroMultiSelect'
import { compararCodigoPolitica } from '../utils/comissoesFormat'
import { empresaSelecionavel } from '../utils/comissoesElegibilidade'

// Regras PJ: valor fixo mensal da prestação de serviços de cada cargo PJ. Gravada em
// fato_politica_comissao com prestacao_pj = true (comissao_valor = valor fixo, sem Fonte/Base) —
// assim aparece em Prestadores de Serviços, Processamento, PDF e TXT como qualquer política.
// Empresas que pagam (pj_empresas): cada empresa marcada paga um valor — o mesmo pra todas ou um
// diferente por empresa (pj_valor_diferente). comissao_valor guarda o TOTAL (soma das empresas).
// Tipo "Variáveis" (pj_variaveis): marca comissões (pj_politica_ids = grupo_politica_id, ex: PREST001/PREST002) que
// viram UMA linha no Processamento de Comissões (total + Visualizar) — não muda o cálculo.
// Tipo "Percentual" (pj_percentual): aplica % sobre regras PJ de Valor fixo e/ou Variáveis
// (pj_percentuais = [{ regra_id: grupo_politica_id, percentual }]) — mesmo % pra todas
// (pj_valor_diferente = false) ou um % por regra. Vira linha a pagar em Prestadores de Serviços.

// Tipo "Bonificação por Meta" (pj_bonificacao = { empresa_ids, componentes, base_ids, faixas }):
// meta = metas aprovadas de Pós-Vendas das empresas marcadas no mês; realizado = soma das Bases de
// Cálculo marcadas (só essas empresas); faixas por % atingido pagam um valor fixo em R$.

// Documentos obrigatórios (pj_documentos = ['Boleto', 'Extrato', ...]), em qualquer tipo de regra:
// em Prestadores de Serviços o prestador anexa cada documento no mês, e o Conferir Comissões só
// libera com todos anexados (tabela pj_anexos + bucket pj-anexos).

const TIPOS_REGRA = [
  { value: 'FIXO', label: 'Valor fixo' },
  { value: 'VARIAVEIS', label: 'Variáveis' },
  { value: 'PERCENTUAL', label: '% sobre regras' },
  // Um tipo só "Bonificação" — dentro dele escolhe por Meta (BONIFICACAO) ou por Margem (BONIFICACAO_MARGEM).
  { value: 'BONIFICACAO', label: 'Bonificação' },
  { value: 'COPARTICIPACAO', label: 'Coparticipação' },
]
// Coparticipação = pj_coparticipacao { percentual, empresas }: em Prestadores de Serviços o usuário lança
// o valor total do boleto do mês; o sistema aplica o % e divide em partes iguais entre as empresas
// marcadas (reembolso somado ao que o prestador recebe).
// Bonificação por Margem = pj_bonificacao com modo 'MARGEM': Margem % = Bases de Lucro
// (lucro_base_ids) ÷ Bases de Faturamento (base_ids), nas empresas marcadas.
// Descontos PJ (mesma tela, prop descontos): pj_desconto = { tipo: 'FIXO', valor } |
// { tipo: 'PERCENTUAL', itens: [{ regra_id, percentual }], percentual_igual } | { tipo: 'LANCADO' }.
// Entram NEGATIVOS no que o prestador recebe em Prestadores de Serviços.
const TIPOS_DESCONTO = [
  { value: 'DESC_FIXO', label: 'Valor fixo mensal' },
  { value: 'DESC_PERCENTUAL', label: '% sobre regras' },
  { value: 'DESC_LANCADO', label: 'Valor lançado no mês' },
]
const tipoDaRegra = (r) => r.pj_desconto ? `DESC_${r.pj_desconto.tipo}` : r.pj_coparticipacao ? 'COPARTICIPACAO' : r.pj_bonificacao ? (r.pj_bonificacao.modo === 'MARGEM' ? 'BONIFICACAO_MARGEM' : 'BONIFICACAO') : r.pj_percentual ? 'PERCENTUAL' : r.pj_variaveis ? 'VARIAVEIS' : 'FIXO'

// Partes da meta de Pós-Vendas (fato_metas_publicadas) — ver getMetasEmpresasPeriodo.
const COMPONENTES_META = [
  { value: 'balcao', label: 'Peças (metas de Peças)' },
  { value: 'oficina', label: 'Oficina — peças + serviços (metas de Serviços, sem Funilaria)' },
  { value: 'funilaria', label: 'Funilaria/Pintura (metas de Funilaria)' },
]
const OPERADORES_FAIXA = ['>=', '>', '<=', '<']
const FAIXA_VAZIA = { nome: '', operador: '>=', valor: '', premio: '' }

const FORM_VAZIO = {
  codigo_politica: '',
  descricao_comissao: '',
  cargo_id: '',
  comissao_valor: '',
  tipo: 'FIXO',
  pj_politica_ids: [],
  // Percentual: regras marcadas, % único (pct_igual) ou um % por regra (pctPorRegra).
  regra_ids: [],
  pct_igual: '',
  pctPorRegra: {},
  // Bonificação por Meta
  bon_empresa_ids: [],
  bon_componentes: ['balcao', 'oficina'],
  bon_base_ids: [],
  bon_lucro_base_ids: [],
  bon_faixas: [{ ...FAIXA_VAZIA }],
  // Coparticipação
  cop_percentual: '30',
  pj_valor_diferente: false,
  empresa_ids: [],
  valoresEmpresa: {},
  tipo_processo: '11',
  vig_inicio: '',
  vig_fim: '',
  ativo: true,
  exige_documentos: false,
  documentos: [''],
}

const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

// descontos: mesma tela, no menu Descontos PJ (lista/cadastra só os descontos).
export default function RegrasPJ({ descontos = false }) {
  const { hasActionOrDefault } = useAuth()
  const menuPath = descontos ? 'descontos-pj' : 'regras-pj'
  const canEdit = hasActionOrDefault(menuPath, 'editar')
  const canDelete = hasActionOrDefault(menuPath, 'excluir')
  const tiposDaTela = descontos ? TIPOS_DESCONTO : TIPOS_REGRA
  const nomeItem = descontos ? 'desconto PJ' : 'regra PJ'

  const [regras, setRegras] = useState([])
  // Regras PJ que não são desconto — o desconto "% sobre regras" escolhe entre elas.
  const [regrasPagamento, setRegrasPagamento] = useState([])
  const [politicasBase, setPoliticasBase] = useState([])
  const [cargos, setCargos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [tiposProcesso, setTiposProcesso] = useState([])
  const [basesCalculo, setBasesCalculo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const [erroForm, setErroForm] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [politicas, carg, emps, tipos, bases] = await Promise.all([
        apiService.getPoliticaComissao(),
        apiService.getCargos(),
        apiService.getEmpresas(),
        apiService.getTiposProcesso(),
        apiService.getBasesCalculo(),
      ])
      setBasesCalculo(bases.filter(b => b.ativo !== false))
      setRegras(politicas.filter(p => p.prestacao_pj && (descontos ? !!p.pj_desconto : !p.pj_desconto)))
      setRegrasPagamento(politicas.filter(p => p.prestacao_pj && !p.pj_desconto))
      setPoliticasBase(politicas.filter(p => !p.prestacao_pj))
      setCargos(carg)
      setEmpresas(emps)
      setTiposProcesso(tipos)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [descontos])

  // Só cargos marcados como PJ (Tipo de Contratação no cadastro de Cargos).
  const cargosDoGrupo = useMemo(() => cargos
    .filter(c => c.ativo !== false && c.empresa_id && c.tipo_contratacao === 'PJ' && !c.empresa_visual)
    .sort((a, b) => a.nome_empresa.localeCompare(b.nome_empresa, 'pt-BR') || (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR')),
    [cargos])


  const nomeEmpresa = (e) => e?.empresa_fantasia || e?.nome_empresa || ''
  const empresasPagadoras = useMemo(() => empresas
    .filter(empresaSelecionavel)
    .sort((a, b) => (a.agrupamento_nome || '').localeCompare(b.agrupamento_nome || '', 'pt-BR') || nomeEmpresa(a).localeCompare(nomeEmpresa(b), 'pt-BR')),
    [empresas])
  const codigoPoliticaTxt = (p) => (p?.codigo_politica || '').trim().toUpperCase()
  // Nomes (código — descrição) das comissões de uma regra Variáveis, pro tooltip da lista.
  const nomesComissoes = (r) => (r.pj_politica_ids || []).map(id => {
    const p = politicasBase.find(x => (x.grupo_politica_id || x.id) === id)
    return p ? `${codigoPoliticaTxt(p) ? codigoPoliticaTxt(p) + ' — ' : ''}${p.descricao_comissao || '-'}` : '(política excluída)'
  })
  const numero = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0
  const valorDaEmpresa = (id) => form.pj_valor_diferente ? numero(form.valoresEmpresa[id]) : numero(form.comissao_valor)
  const totalPrestacao = form.empresa_ids.reduce((s, id) => s + valorDaEmpresa(id), 0)
  const toggleEmpresa = (id) => setForm(f => ({
    ...f,
    empresa_ids: f.empresa_ids.includes(id) ? f.empresa_ids.filter(x => x !== id) : [...f.empresa_ids, id],
  }))
  // Comissões que a regra Variáveis pode agrupar (uma por política — grupo_politica_id): as do
  // cargo escolhido, ou todas se o cargo ainda não tiver nenhuma.
  const comissoesDisponiveis = useMemo(() => {
    const doCargo = politicasBase.filter(p => p.cargo_id === form.cargo_id)
    const fonte = doCargo.length > 0 ? doCargo : politicasBase
    const porGrupo = new Map()
    fonte.forEach(p => {
      const id = p.grupo_politica_id || p.id
      if (!porGrupo.has(id)) porGrupo.set(id, { id, codigo: codigoPoliticaTxt(p), descricao: p.descricao_comissao || '-' })
    })
    // Comissão já marcada que saiu da lista (outro cargo): continua visível pra poder desmarcar.
    form.pj_politica_ids.forEach(id => {
      if (porGrupo.has(id)) return
      const p = politicasBase.find(x => (x.grupo_politica_id || x.id) === id)
      porGrupo.set(id, { id, codigo: codigoPoliticaTxt(p), descricao: p?.descricao_comissao || '(política excluída)' })
    })
    return [...porGrupo.values()].sort((a, b) => (a.codigo || '~').localeCompare(b.codigo || '~', 'pt-BR', { numeric: true }) || a.descricao.localeCompare(b.descricao, 'pt-BR'))
  }, [politicasBase, form.cargo_id, form.pj_politica_ids])
  const toggleComissao = (id) => setForm(f => ({
    ...f,
    pj_politica_ids: f.pj_politica_ids.includes(id) ? f.pj_politica_ids.filter(x => x !== id) : [...f.pj_politica_ids, id],
  }))

  // Regras que o Percentual pode usar: Valor fixo e Variáveis do mesmo cargo (nunca outra Percentual).
  // Desconto "% sobre regras": pode usar qualquer regra PJ de pagamento do cargo.
  const regrasParaPercentual = useMemo(() => (descontos ? regrasPagamento : regras)
    .filter(r => (descontos || (!r.pj_percentual && !r.pj_bonificacao && !r.pj_coparticipacao)) && r.id !== editingId && (!form.cargo_id || r.cargo_id === form.cargo_id || form.regra_ids.includes(r.grupo_politica_id || r.id)))
    .sort((a, b) => compararCodigoPolitica(a, b)),
    [descontos, regrasPagamento, regras, editingId, form.cargo_id, form.regra_ids])
  const toggleRegraPct = (id) => setForm(f => ({
    ...f,
    regra_ids: f.regra_ids.includes(id) ? f.regra_ids.filter(x => x !== id) : [...f.regra_ids, id],
  }))
  const pctDaRegra = (id) => form.pj_valor_diferente ? numero(form.pctPorRegra[id]) : numero(form.pct_igual)
  // Nomes das regras de uma Percentual, pro tooltip da lista.
  const nomesRegrasPct = (r) => (r.pj_percentuais || []).map(p => {
    const regra = [...regras, ...regrasPagamento].find(x => (x.grupo_politica_id || x.id) === p.regra_id)
    return `${regra ? `${regra.codigo_politica || ''} ${regra.descricao_comissao || ''}`.trim() : '(regra excluída)'}: ${p.percentual}%`
  })

  // Bonificação: liga/desliga um item numa lista do formulário (empresas, partes da meta, bases).
  const toggleLista = (campo, valor) => setForm(f => ({
    ...f,
    [campo]: f[campo].includes(valor) ? f[campo].filter(x => x !== valor) : [...f[campo], valor],
  }))
  const setFaixa = (i, campo, valor) => setForm(f => ({ ...f, bon_faixas: f.bon_faixas.map((x, j) => j === i ? { ...x, [campo]: valor } : x) }))
  const nomeBase = (id) => basesCalculo.find(b => b.id === id)?.nome || '(base excluída)'

  const empresasDaPrestacao = useMemo(() => [...new Set(regrasPagamento
    .filter(r => r.cargo_id === form.cargo_id && Array.isArray(r.pj_empresas))
    .flatMap(r => r.pj_empresas.map(p => p.empresa_id)))], [regrasPagamento, form.cargo_id])

  const todasMarcadas = empresasPagadoras.length > 0 && empresasPagadoras.every(e => form.empresa_ids.includes(e.id))
  const marcarTodas = () => setForm(f => ({ ...f, empresa_ids: todasMarcadas ? [] : empresasPagadoras.map(e => e.id) }))

  // Filtro de Cargo da lista (vazio = todos).
  const [filtroCargo, setFiltroCargo] = useState([])
  const cargosDasRegras = useMemo(() => [...new Set(regras.map(r => r.cargo_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [regras])

  const lista = useMemo(() => [...regras].filter(r => filtroCargo.length === 0 || filtroCargo.includes(r.cargo_nome)).sort((a, b) => compararCodigoPolitica(a, b) || (a.cargo_nome || '').localeCompare(b.cargo_nome || '', 'pt-BR')), [regras, filtroCargo])

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(descontos ? { ...FORM_VAZIO, tipo: 'DESC_FIXO' } : FORM_VAZIO)
    setErroForm(null)
    setModalAberto(true)
  }

  // Duplicar: abre o cadastro já preenchido com os dados da regra, como uma regra nova.
  const abrirEditar = (r, duplicar = false) => {
    setEditingId(duplicar ? null : r.id)
    const pjEmpresas = Array.isArray(r.pj_empresas) ? r.pj_empresas : []
    setForm({
      codigo_politica: r.codigo_politica || '',
      descricao_comissao: r.descricao_comissao || '',
      cargo_id: r.cargo_id || '',
      // Mesmo valor pra todas: o campo mostra o valor de UMA empresa (comissao_valor é o total).
      comissao_valor: r.pj_desconto?.tipo === 'FIXO' ? r.pj_desconto.valor
        : pjEmpresas.length > 0 ? (r.pj_valor_diferente ? '' : pjEmpresas[0].valor) : (r.comissao_valor ?? ''),
      pj_valor_diferente: r.pj_desconto ? r.pj_desconto.percentual_igual == null && r.pj_desconto.tipo === 'PERCENTUAL' : !!r.pj_valor_diferente,
      tipo: tipoDaRegra(r),
      pj_politica_ids: Array.isArray(r.pj_politica_ids) ? r.pj_politica_ids : [],
      regra_ids: (r.pj_desconto?.itens || r.pj_percentuais || []).map(p => p.regra_id),
      pct_igual: r.pj_desconto?.tipo === 'PERCENTUAL' ? (r.pj_desconto.percentual_igual ?? '')
        : r.pj_percentual && !r.pj_valor_diferente ? (r.comissao_total ?? r.pj_percentuais?.[0]?.percentual ?? '') : '',
      pctPorRegra: Object.fromEntries((r.pj_desconto?.itens || r.pj_percentuais || []).map(p => [p.regra_id, p.percentual])),
      bon_empresa_ids: r.pj_bonificacao?.empresa_ids || [],
      bon_componentes: r.pj_bonificacao?.componentes || ['balcao', 'oficina'],
      bon_base_ids: r.pj_bonificacao?.base_ids || [],
      bon_lucro_base_ids: r.pj_bonificacao?.lucro_base_ids || [],
      bon_faixas: r.pj_bonificacao?.faixas?.length ? r.pj_bonificacao.faixas.map(x => ({ ...x })) : [{ ...FAIXA_VAZIA }],
      cop_percentual: r.pj_coparticipacao ? String(r.pj_coparticipacao.percentual ?? '') : '30',
      // Coparticipação guarda as empresas dentro de pj_coparticipacao (não usa pj_empresas).
      // Regra antiga, sem empresas marcadas: começa com a empresa do próprio cargo.
      empresa_ids: r.pj_desconto ? (r.pj_desconto.empresas || []).map(p => p.empresa_id)
        : r.pj_coparticipacao ? (r.pj_coparticipacao.empresas || []).map(p => p.empresa_id)
        : pjEmpresas.length > 0 ? pjEmpresas.map(p => p.empresa_id) : (r.empresa_id ? [r.empresa_id] : []),
      valoresEmpresa: Object.fromEntries(pjEmpresas.map(p => [p.empresa_id, p.valor])),
      tipo_processo: r.tipo_processo || '',
      vig_inicio: r.vig_inicio || '',
      vig_fim: r.vig_fim || '',
      ativo: r.ativo !== false,
      exige_documentos: Array.isArray(r.pj_documentos) && r.pj_documentos.length > 0,
      documentos: Array.isArray(r.pj_documentos) && r.pj_documentos.length > 0 ? [...r.pj_documentos] : [''],
    })
    setErroForm(null)
    setModalAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)
    setErroForm(null)
    try {
      const cargo = cargos.find(c => c.id === form.cargo_id)
      const empresa = empresas.find(x => x.id === cargo?.empresa_id)
      const documentosExigidos = form.exige_documentos ? form.documentos.map(d => d.trim()).filter(Boolean) : []
      if (form.exige_documentos && documentosExigidos.length === 0) throw new Error('informe o nome de pelo menos um documento a anexar.')
      const payload = {
        prestacao_pj: true,
        codigo_politica: form.codigo_politica.trim().toUpperCase(),
        descricao_comissao: form.descricao_comissao.trim(),
        cargo_id: form.cargo_id,
        cargo_nome: cargo?.nome_cargo || null,
        empresa_id: cargo?.empresa_id || null,
        empresa_nome: empresa?.empresa_fantasia || empresa?.nome_empresa || null,
        agrupamento_empresa_id: empresa?.agrupamento_empresa_id || null,
        agrupamento_nome: empresa?.agrupamento_nome || null,
        // Total da prestação = soma do que cada empresa marcada paga.
        comissao_valor: totalPrestacao,
        pj_valor_diferente: form.pj_valor_diferente,
        pj_empresas: form.empresa_ids.map(id => ({
          empresa_id: id,
          empresa_nome: nomeEmpresa(empresas.find(x => x.id === id)),
          valor: valorDaEmpresa(id),
        })),
        codigo_rubrica: null, // PJ não usa rubrica
        tipo_processo: form.tipo_processo || null,
        vig_inicio: form.vig_inicio || null,
        vig_fim: form.vig_fim || null,
        ativo: form.ativo,
        pj_documentos: documentosExigidos.length > 0 ? documentosExigidos : null,
        // Valor fixo: sem Fonte/Base/Regra nem percentuais.
        nivel_calculo: 'INDIVIDUAL',
        usa_faixa: 'NÃO',
        fonte_calculo_id: null,
        base_calculo_id: null,
        regra_comissao_id: null,
        comissao_servicos: null,
        comissao_pecas: null,
        comissao_total: null,
        comissao_todas_empresas: false,
        // Linha por empresa abaixo da comissão (telas de Comissões, Processamento e PDF).
        detalhar_por_empresa: true,
      }
      // Só a Bonificação usa pj_bonificacao; os outros tipos limpam.
      payload.pj_bonificacao = null
      payload.pj_coparticipacao = null
      payload.pj_desconto = null
      if (descontos) {
        const limpa = { pj_variaveis: false, pj_politica_ids: null, pj_percentual: false, pj_percentuais: null, comissao_valor: null, pj_empresas: null, pj_valor_diferente: false, detalhar_por_empresa: false }
        if (form.tipo === 'DESC_FIXO') {
          const valor = numero(form.comissao_valor)
          if (!(valor > 0)) throw new Error('informe o valor do desconto.')
          const rateio = form.empresa_ids.map(id => ({ empresa_id: id, empresa_nome: nomeEmpresa(empresas.find(x => x.id === id)) }))
          Object.assign(payload, limpa, { pj_desconto: { tipo: 'FIXO', valor, empresas: rateio }, detalhar_por_empresa: rateio.length > 0 })
        } else if (form.tipo === 'DESC_PERCENTUAL') {
          if (form.regra_ids.length === 0) throw new Error('marque pelo menos uma regra PJ sobre a qual o desconto incide.')
          const itens = form.regra_ids.map(id => ({ regra_id: id, percentual: pctDaRegra(id) }))
          if (itens.some(i => !(i.percentual > 0))) throw new Error('informe o % do desconto.')
          Object.assign(payload, limpa, { pj_desconto: { tipo: 'PERCENTUAL', itens, percentual_igual: form.pj_valor_diferente ? null : numero(form.pct_igual) }, comissao_total: form.pj_valor_diferente ? null : numero(form.pct_igual) })
        } else {
          Object.assign(payload, limpa, { pj_desconto: { tipo: 'LANCADO' } })
        }
      } else if (form.tipo === 'COPARTICIPACAO') {
        // Coparticipação: só % e empresas — o valor do boleto é lançado todo mês em Prestadores de Serviços.
        const percentual = numero(form.cop_percentual)
        if (!(percentual > 0 && percentual <= 100)) throw new Error('informe o % de coparticipação (entre 0,01 e 100).')
        if (form.empresa_ids.length === 0) throw new Error('marque pelo menos uma empresa que divide o boleto.')
        Object.assign(payload, {
          pj_coparticipacao: {
            percentual,
            empresas: form.empresa_ids.map(id => ({ empresa_id: id, empresa_nome: nomeEmpresa(empresas.find(x => x.id === id)) })),
          },
          pj_variaveis: false, pj_politica_ids: null,
          pj_percentual: false, pj_percentuais: null,
          comissao_valor: null, pj_empresas: null, pj_valor_diferente: false, detalhar_por_empresa: true,
        })
      } else if (form.tipo === 'BONIFICACAO' || form.tipo === 'BONIFICACAO_MARGEM') {
        const porMargem = form.tipo === 'BONIFICACAO_MARGEM'
        if (form.bon_empresa_ids.length === 0) throw new Error('marque pelo menos uma empresa.')
        if (!porMargem && form.bon_componentes.length === 0) throw new Error('marque pelo menos uma parte da meta de Pós-Vendas.')
        if (form.bon_base_ids.length === 0) throw new Error(porMargem ? 'marque pelo menos uma Base de Faturamento.' : 'marque pelo menos uma Base de Cálculo para o realizado.')
        if (porMargem && form.bon_lucro_base_ids.length === 0) throw new Error('marque pelo menos uma Base de Lucro.')
        const faixas = form.bon_faixas
          .filter(x => String(x.valor).trim() !== '' || String(x.premio).trim() !== '')
          .map(x => ({ nome: (x.nome || '').trim(), operador: x.operador, valor: numero(x.valor), premio: numero(x.premio) }))
        if (faixas.length === 0) throw new Error('cadastre pelo menos uma faixa (% atingido → prêmio).')
        Object.assign(payload, {
          pj_bonificacao: porMargem
            ? { modo: 'MARGEM', empresa_ids: form.bon_empresa_ids, base_ids: form.bon_base_ids, lucro_base_ids: form.bon_lucro_base_ids, faixas }
            : { modo: 'META', empresa_ids: form.bon_empresa_ids, componentes: form.bon_componentes, base_ids: form.bon_base_ids, faixas },
          pj_variaveis: false, pj_politica_ids: null,
          pj_percentual: false, pj_percentuais: null,
          comissao_valor: null, pj_empresas: null, pj_valor_diferente: false, detalhar_por_empresa: false,
        })
      } else if (form.tipo === 'VARIAVEIS') {
        // Variáveis: só a lista de códigos — sem valor fixo nem empresas.
        if (form.pj_politica_ids.length === 0) throw new Error('marque pelo menos uma comissão para agrupar.')
        Object.assign(payload, {
          pj_variaveis: true,
          pj_percentual: false,
          pj_percentuais: null,
          pj_politica_ids: form.pj_politica_ids,
          comissao_valor: null,
          pj_empresas: null,
          pj_valor_diferente: false,
          detalhar_por_empresa: false,
        })
      } else if (form.tipo === 'PERCENTUAL') {
        // Percentual: % sobre o valor de outras regras PJ (Valor fixo / Variáveis) — calculado na
        // tela de Comissões, somado ao que o PJ recebe.
        if (form.regra_ids.length === 0) throw new Error('marque pelo menos uma regra (Valor fixo ou Variáveis).')
        const itens = form.regra_ids.map(id => ({ regra_id: id, percentual: pctDaRegra(id) }))
        const semPct = itens.filter(i => !(i.percentual > 0))
        if (semPct.length > 0) throw new Error(form.pj_valor_diferente
          ? `informe o % de: ${semPct.map(i => regras.find(x => (x.grupo_politica_id || x.id) === i.regra_id)?.codigo_politica || '?').join(', ')}.`
          : 'informe o % a aplicar.')
        Object.assign(payload, {
          pj_percentual: true,
          pj_percentuais: itens,
          pj_variaveis: false,
          pj_politica_ids: null,
          comissao_valor: null,
          comissao_total: form.pj_valor_diferente ? null : numero(form.pct_igual),
          pj_empresas: null,
          detalhar_por_empresa: false,
        })
      } else {
        if (form.empresa_ids.length === 0) throw new Error('marque pelo menos uma empresa que paga a prestação.')
        const semValor = payload.pj_empresas.filter(p => !(p.valor > 0))
        if (semValor.length > 0) throw new Error(form.pj_valor_diferente
          ? `informe o valor de: ${semValor.map(p => p.empresa_nome).join(', ')}.`
          : 'informe o valor da prestação de serviços.')
        Object.assign(payload, { pj_variaveis: false, pj_politica_ids: null, pj_percentual: false, pj_percentuais: null })
      }
      if (editingId) {
        await apiService.updatePoliticaComissao(editingId, payload)
      } else {
        await apiService.createPoliticaComissao({ ...payload, grupo_politica_id: crypto.randomUUID() })
      }
      setModalAberto(false)
      await loadData()
    } catch (err) {
      setErroForm(err.message || String(err))
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  const handleExcluir = async (r) => {
    if (!window.confirm(`Excluir ${descontos ? 'o desconto PJ' : 'a regra PJ'} ${r.codigo_politica || ''} — ${r.descricao_comissao || ''}?`)) return
    try {
      await apiService.deletePoliticaComissao(r.id)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div className="min-h-full w-full p-6 space-y-4">

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{descontos ? 'Descontos PJ' : 'Regras PJ'}</h1>
          <p className="text-xs text-slate-500">{descontos
            ? 'O que será descontado do prestador PJ — valor fixo mensal, % sobre regras PJ ou valor lançado no mês. Entra negativo em Prestadores de Serviços.'
            : 'Valor fixo mensal da prestação de serviços de cada cargo PJ — aparece em Prestadores de Serviços para o funcionário desse cargo.'}</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            {descontos ? 'Cadastrar Desconto' : 'Cadastrar Regra'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* FILTROS */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1 w-80">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo</label>
          <FiltroMultiSelect placeholder="Todos" opcoes={cargosDasRegras} selecionados={filtroCargo} onChange={setFiltroCargo} comBusca />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {(canEdit || canDelete) && <th className="p-3 w-12 text-center">Ações</th>}
              <th className="p-3 min-w-[90px]">Código</th>
              <th className="p-3 min-w-[260px]">Descrição</th>
              <th className="p-3 min-w-[260px]">Cargo</th>
              <th className="p-3 min-w-[130px] text-right">Regra</th>
              <th className="p-3 min-w-[110px]">Vigência</th>
              <th className="p-3 w-20 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="7" className="p-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="7" className="p-6 text-center text-slate-400">{regras.length === 0 ? `Nenhum${descontos ? '' : 'a'} ${nomeItem} cadastrad${descontos ? 'o' : 'a'}.` : `Nenhum${descontos ? '' : 'a'} ${nomeItem} para o cargo selecionado.`}</td></tr>
            ) : lista.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                {(canEdit || canDelete) && (
                  <td className="p-3 text-center">
                    <AcoesDropdown
                      onEditar={canEdit ? () => abrirEditar(r) : null}
                      onDuplicar={canEdit ? () => abrirEditar(r, true) : null}
                      onExcluir={canDelete ? () => handleExcluir(r) : null}
                    />
                  </td>
                )}
                <td className="p-3 font-mono font-semibold text-slate-700">{r.codigo_politica || <span className="text-slate-300">—</span>}</td>
                <td className="p-3 font-semibold text-slate-800">{r.descricao_comissao || '-'}</td>
                <td className="p-3 text-slate-700">
                  {r.cargo_nome || '-'}
                  <div className="text-[10px] text-slate-400">{r.empresa_nome}</div>
                </td>
                <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                  {r.pj_desconto ? (
                    <span className="font-sans text-[11px] font-semibold text-rose-700" title={r.pj_desconto.tipo === 'PERCENTUAL' ? nomesRegrasPct({ pj_percentuais: r.pj_desconto.itens }).join('\n') : undefined}>
                      {r.pj_desconto.tipo === 'FIXO' ? `Desconto fixo -${fmtBRL(r.pj_desconto.valor)}${(r.pj_desconto.empresas || []).length > 0 ? ` · rateado em ${r.pj_desconto.empresas.length} empresas` : ''}`
                        : r.pj_desconto.tipo === 'PERCENTUAL' ? `Desconto ${r.pj_desconto.percentual_igual != null ? `${r.pj_desconto.percentual_igual}%` : '% diferentes'} sobre ${(r.pj_desconto.itens || []).length} regra${(r.pj_desconto.itens || []).length === 1 ? '' : 's'}`
                        : 'Desconto lançado no mês'}
                    </span>
                  ) : r.pj_coparticipacao ? (
                    <span className="font-sans text-[11px] font-semibold text-teal-700"
                      title={(r.pj_coparticipacao.empresas || []).map(p => p.empresa_nome).join('\n')}>
                      Coparticipação {r.pj_coparticipacao.percentual}% · {(r.pj_coparticipacao.empresas || []).length} empresa{(r.pj_coparticipacao.empresas || []).length === 1 ? '' : 's'}
                    </span>
                  ) : r.pj_bonificacao ? (
                    <span className="font-sans text-[11px] font-semibold text-rose-700"
                      title={[
                        ...(r.pj_bonificacao.faixas || []).map(x => `${x.nome ? `${x.nome}: ` : ''}${x.operador} ${x.valor}% → ${fmtBRL(x.premio)}`),
                        (r.pj_bonificacao.modo === 'MARGEM' ? 'Faturamento: ' : 'Realizado: ') + (r.pj_bonificacao.base_ids || []).map(nomeBase).join(', '),
                        ...(r.pj_bonificacao.modo === 'MARGEM' ? ['Lucro: ' + (r.pj_bonificacao.lucro_base_ids || []).map(nomeBase).join(', ')] : []),
                      ].join('\n')}>
                      {r.pj_bonificacao.modo === 'MARGEM' ? 'Bonificação por Margem' : 'Bonificação por Meta'} · {(r.pj_bonificacao.faixas || []).length} faixa{(r.pj_bonificacao.faixas || []).length === 1 ? '' : 's'}
                    </span>
                  ) : r.pj_percentual ? (
                    <span className="font-sans text-[11px] font-semibold text-amber-700" title={nomesRegrasPct(r).join('\n')}>
                      {r.pj_valor_diferente ? '% diferentes' : `${r.comissao_total ?? ''}%`} sobre {(r.pj_percentuais || []).length} regra{(r.pj_percentuais || []).length === 1 ? '' : 's'}
                    </span>
                  ) : r.pj_variaveis ? (
                    <span className="font-sans text-[11px] font-semibold text-indigo-700" title={nomesComissoes(r).join('\n')}>Variáveis: {(r.pj_politica_ids || []).length} comissõe{(r.pj_politica_ids || []).length === 1 ? '' : 's'}</span>
                  ) : fmtBRL(r.comissao_valor)}
                  {Array.isArray(r.pj_documentos) && r.pj_documentos.length > 0 && (
                    <div className="font-sans font-semibold text-[10px] text-blue-600 flex items-center justify-end gap-1" title={r.pj_documentos.join('\n')}>
                      <Paperclip className="h-3 w-3" /> {r.pj_documentos.length} documento{r.pj_documentos.length === 1 ? '' : 's'} a anexar
                    </div>
                  )}
                  {Array.isArray(r.pj_empresas) && r.pj_empresas.length > 0 && (
                    <div className="font-sans font-normal text-[10px] text-slate-400" title={r.pj_empresas.map(p => `${p.empresa_nome}: ${fmtBRL(p.valor)}`).join('\n')}>
                      {r.pj_empresas.length} empresa{r.pj_empresas.length === 1 ? '' : 's'} · {r.pj_valor_diferente ? 'valores diferentes' : 'mesmo valor'}
                    </div>
                  )}
                </td>
                <td className="p-3 font-mono text-[11px] text-slate-600">
                  <div>{fmtDate(r.vig_inicio)}</div>
                  <div className="text-slate-400">{fmtDate(r.vig_fim)}</div>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${r.ativo !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {r.ativo !== false ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: CADASTRAR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[720px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {descontos ? (editingId ? 'Editar Desconto PJ' : 'Cadastrar Desconto PJ') : (editingId ? 'Editar Regra PJ' : 'Cadastrar Regra PJ')}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar">

                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Cargo <span className="text-red-500">*</span> <span className="font-normal normal-case text-slate-400">(só cargos com Tipo de Contratação PJ)</span></label>
                  <select required value={form.cargo_id} onChange={e => {
                    const empresaCargo = cargos.find(x => x.id === e.target.value)?.empresa_id
                    setForm(f => ({ ...f, cargo_id: e.target.value, empresa_ids: f.empresa_ids.length === 0 && empresaCargo ? [empresaCargo] : f.empresa_ids }))
                  }} className={SEL}>
                    <option value="">Selecione o cargo...</option>
                    {cargosDoGrupo.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_cargo} — {c.nome_empresa}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-[160px_1fr] gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Código <span className="text-red-500">*</span></label>
                    <input type="text" required value={form.codigo_politica}
                      onChange={e => setForm(f => ({ ...f, codigo_politica: e.target.value.toUpperCase() }))}
                      placeholder="Ex: PJ001" className={`${INP} uppercase`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Descrição <span className="text-red-500">*</span></label>
                    <input type="text" required value={form.descricao_comissao}
                      onChange={e => setForm(f => ({ ...f, descricao_comissao: e.target.value }))}
                      placeholder="Ex: Prestação de Serviços - Inteligência de Negócios" className={INP} />
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
                  <span className={LBL}>{descontos ? 'Tipo do Desconto' : 'Tipo da Regra'}</span>
                  {tiposDaTela.map(t => (
                    <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={form.tipo === t.value || (t.value === 'BONIFICACAO' && form.tipo === 'BONIFICACAO_MARGEM')}
                        onChange={() => setForm(f => ({ ...f, tipo: t.value, pj_valor_diferente: false }))} />
                      {t.label}
                    </label>
                  ))}
                </div>

                {form.tipo === 'DESC_FIXO' && (
                  <div className="rounded-md border border-slate-200 p-3 space-y-2">
                    <p className="text-[11px] text-slate-400">Desconta este valor todo mês do que o prestador recebe (entra negativo em Prestadores de Serviços).</p>
                    <div className="flex flex-col gap-1.5 w-56">
                      <label className={LBL}>Valor do desconto (R$) <span className="text-red-500">*</span></label>
                      <input type="number" required min="0.01" step="0.01" value={form.comissao_valor}
                        onChange={e => setForm(f => ({ ...f, comissao_valor: e.target.value }))}
                        placeholder="0,00" className={`${INP} text-right font-mono`} />
                    </div>
                    {/* Rateio: o valor é dividido em partes iguais entre as empresas marcadas (opcional). */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <label className={LBL}>Ratear entre as empresas <span className="font-normal normal-case text-slate-400">(opcional — partes iguais)</span></label>
                        {empresasDaPrestacao.length > 0 && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, empresa_ids: empresasDaPrestacao }))}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                            Usar as empresas da prestação de serviços
                          </button>
                        )}
                      </div>
                      <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {empresasPagadoras.map(e => (
                          <label key={e.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs cursor-pointer">
                            <span className="flex items-center gap-2 min-w-0">
                              <input type="checkbox" checked={form.empresa_ids.includes(e.id)} onChange={() => toggleEmpresa(e.id)} className="w-3.5 h-3.5" />
                              <span className="truncate text-slate-700">{nomeEmpresa(e)}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{e.agrupamento_nome}</span>
                            </span>
                            {form.empresa_ids.includes(e.id) && numero(form.comissao_valor) > 0 && (
                              <span className="font-mono text-rose-600 shrink-0">-{fmtBRL(numero(form.comissao_valor) / form.empresa_ids.length)}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {form.tipo === 'DESC_LANCADO' && (
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-[11px] text-slate-500">
                      O valor muda todo mês: em <strong>Prestadores de Serviços</strong>, na calculadora da linha deste desconto, informe o
                      <strong> valor do desconto do mês</strong> e clique em Aplicar. Entra negativo no que o prestador recebe.
                    </p>
                  </div>
                )}

                {(form.tipo === 'BONIFICACAO' || form.tipo === 'BONIFICACAO_MARGEM') && (
                  <div className="rounded-md border border-slate-200 p-3 space-y-4">
                    <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
                      <span className={LBL}>Bonificação por</span>
                      {[['BONIFICACAO', 'Meta (realizado ÷ meta)'], ['BONIFICACAO_MARGEM', 'Margem (lucro ÷ faturamento)']].map(([valor, rotulo]) => (
                        <label key={valor} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={form.tipo === valor} onChange={() => setForm(f => ({ ...f, tipo: valor }))} />
                          {rotulo}
                        </label>
                      ))}
                    </div>
                    {form.tipo === 'BONIFICACAO_MARGEM' ? (
                    <p className="text-[11px] text-slate-400">
                      No mês calculado: <strong>Margem %</strong> = soma das Bases de <strong>Lucro</strong> ÷ soma das Bases de <strong>Faturamento</strong>,
                      só das empresas marcadas. A primeira faixa que casar com a margem define o prêmio. Entra como linha a pagar em Prestadores de Serviços.
                    </p>
                    ) : (
                    <p className="text-[11px] text-slate-400">
                      No mês calculado: <strong>Meta</strong> = soma das metas aprovadas de Pós-Vendas das empresas marcadas;
                      <strong> Realizado</strong> = soma das Bases de Cálculo marcadas (só dessas empresas); <strong>% atingido</strong> = Realizado ÷ Meta.
                      A primeira faixa que casar define o prêmio. Entra como linha a pagar em Prestadores de Serviços.
                    </p>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Empresas <span className="text-red-500">*</span></label>
                        <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {empresasPagadoras.map(e => (
                            <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={form.bon_empresa_ids.includes(e.id)} onChange={() => toggleLista('bon_empresa_ids', e.id)} className="w-3.5 h-3.5" />
                              <span className="truncate text-slate-700">{nomeEmpresa(e)}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{e.agrupamento_nome}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {!(form.tipo === 'BONIFICACAO_MARGEM') && (
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Metas aprovadas <span className="text-red-500">*</span></label>
                        <div className="rounded-md border border-slate-100 p-2 space-y-1.5 text-xs">
                          <div className="font-bold text-slate-600">Pós-Vendas</div>
                          {COMPONENTES_META.map(cm => (
                            <label key={cm.value} className="flex items-center gap-2 pl-3 cursor-pointer">
                              <input type="checkbox" checked={form.bon_componentes.includes(cm.value)} onChange={() => toggleLista('bon_componentes', cm.value)} className="w-3.5 h-3.5" />
                              <span className="text-slate-700">{cm.label}</span>
                            </label>
                          ))}
                          <label className="flex items-center gap-2 pt-1 text-slate-400 cursor-not-allowed" title="Ainda não há metas de Vendas cadastradas no Planejamento de Metas">
                            <input type="checkbox" disabled className="w-3.5 h-3.5" />
                            <span className="font-bold">Vendas</span>
                            <span className="text-[10px]">(sem metas cadastradas ainda)</span>
                          </label>
                        </div>
                      </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>{form.tipo === 'BONIFICACAO_MARGEM' ? 'Bases de Faturamento (divisor da margem)' : 'Bases de Cálculo do realizado'} <span className="text-red-500">*</span></label>
                      <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {basesCalculo.map(b => (
                          <label key={b.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={form.bon_base_ids.includes(b.id)} onChange={() => toggleLista('bon_base_ids', b.id)} className="w-3.5 h-3.5" />
                            <span className="text-slate-700">{b.nome}</span>
                            {b.sistema && <span className="text-[10px] text-slate-400 shrink-0">{b.sistema}</span>}
                          </label>
                        ))}
                      </div>
                    </div>

                    {form.tipo === 'BONIFICACAO_MARGEM' && (
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Bases de Lucro (numerador da margem) <span className="text-red-500">*</span></label>
                        <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {basesCalculo.map(b => (
                            <label key={b.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer">
                              <input type="checkbox" checked={form.bon_lucro_base_ids.includes(b.id)} onChange={() => toggleLista('bon_lucro_base_ids', b.id)} className="w-3.5 h-3.5" />
                              <span className="text-slate-700">{b.nome}</span>
                              {b.sistema && <span className="text-[10px] text-slate-400 shrink-0">{b.sistema}</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>{form.tipo === 'BONIFICACAO_MARGEM' ? 'Faixas (% margem → prêmio)' : 'Faixas (% atingido → prêmio)'} <span className="text-red-500">*</span></label>
                      <div className="space-y-1.5">
                        {form.bon_faixas.map((fx, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <input type="text" value={fx.nome || ''} onChange={e => setFaixa(i, 'nome', e.target.value)}
                              placeholder="Nome (ex: Ouro)" className="w-28 text-xs p-1.5 border border-slate-200 rounded-md" />
                            <span className="text-slate-400 w-14">{form.tipo === 'BONIFICACAO_MARGEM' ? 'Margem' : 'Atingido'}</span>
                            <select value={fx.operador} onChange={e => setFaixa(i, 'operador', e.target.value)} className="text-xs p-1.5 border border-slate-200 rounded-md bg-white">
                              {OPERADORES_FAIXA.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <input type="number" step="0.01" value={fx.valor} onChange={e => setFaixa(i, 'valor', e.target.value)}
                              placeholder="100" className="w-24 text-xs p-1.5 border border-slate-200 rounded-md text-right font-mono" />
                            <span className="text-slate-400">% → paga R$</span>
                            <input type="number" step="0.01" min="0" value={fx.premio} onChange={e => setFaixa(i, 'premio', e.target.value)}
                              placeholder="0,00" className="w-32 text-xs p-1.5 border border-slate-200 rounded-md text-right font-mono" />
                            <button type="button" onClick={() => setForm(f => ({ ...f, bon_faixas: f.bon_faixas.filter((_, j) => j !== i) }))}
                              disabled={form.bon_faixas.length === 1} title="Remover faixa"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setForm(f => ({ ...f, bon_faixas: [...f.bon_faixas, { ...FAIXA_VAZIA }] }))}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                          <Plus className="h-3 w-3" /> Adicionar faixa
                        </button>
                        <p className="text-[10px] text-slate-400">Cadastre da maior para a menor (ex: ≥ 110% → R$ 3.000; ≥ 100% → R$ 2.000; ≥ 90% → R$ 1.000). Nenhuma faixa casando = sem prêmio.</p>
                      </div>
                    </div>
                  </div>
                )}

                {form.tipo === 'COPARTICIPACAO' && (
                  <div className="rounded-md border border-slate-200 p-3 space-y-3">
                    <p className="text-[11px] text-slate-400">
                      Em Prestadores de Serviços, o usuário lança o <strong>valor total do boleto</strong> de cada prestador no mês. O sistema aplica o % abaixo
                      e divide em <strong>partes iguais</strong> entre as empresas marcadas. O valor entra como reembolso, somado ao que o prestador recebe.
                    </p>
                    <div className="flex flex-col gap-1.5 w-40">
                      <label className={LBL}>% de coparticipação <span className="text-red-500">*</span></label>
                      <input type="number" required min="0.01" max="100" step="0.01" value={form.cop_percentual}
                        onChange={e => setForm(f => ({ ...f, cop_percentual: e.target.value }))}
                        placeholder="30" className={`${INP} text-right font-mono`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Empresas que dividem o boleto <span className="text-red-500">*</span></label>
                      <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={todasMarcadas} onChange={marcarTodas} className="w-3.5 h-3.5" />
                          Todas as empresas
                        </label>
                        {empresasPagadoras.map(e => (
                          <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={form.empresa_ids.includes(e.id)} onChange={() => toggleEmpresa(e.id)} className="w-3.5 h-3.5" />
                            <span className={`truncate ${form.empresa_ids.includes(e.id) ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{nomeEmpresa(e)}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{e.agrupamento_nome}</span>
                          </label>
                        ))}
                      </div>
                      {form.empresa_ids.length > 0 && <p className="text-[10px] text-slate-400">Cada empresa assume 1/{form.empresa_ids.length} do valor.</p>}
                    </div>
                  </div>
                )}

                {(form.tipo === 'PERCENTUAL' || form.tipo === 'DESC_PERCENTUAL') && (
                  <div className="rounded-md border border-slate-200 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <label className={LBL}>Regras e % a aplicar <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={!form.pj_valor_diferente} onChange={() => setForm(f => ({ ...f, pj_valor_diferente: false }))} />
                          Mesmo % para todas
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={form.pj_valor_diferente} onChange={() => setForm(f => ({ ...f, pj_valor_diferente: true }))} />
                          % diferente por regra
                        </label>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">{descontos
                      ? 'Desconto = soma de (valor de cada regra marcada no mês × %). Entra negativo em Prestadores de Serviços, reduzindo o total do PJ.'
                      : 'Valor = soma de (valor de cada regra marcada × %). Entra como mais uma linha a pagar em Prestadores de Serviços, somando ao total do PJ.'}</p>

                    {!form.pj_valor_diferente && (
                      <div className="flex flex-col gap-1.5 w-40">
                        <label className={LBL}>% <span className="text-red-500">*</span></label>
                        <input type="number" required min="0.01" step="0.01" value={form.pct_igual}
                          onChange={e => setForm(f => ({ ...f, pct_igual: e.target.value }))}
                          placeholder="0,00" className={`${INP} text-right font-mono`} />
                      </div>
                    )}

                    <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {regrasParaPercentual.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-400">Nenhuma regra de Valor fixo ou Variáveis cadastrada para este cargo.</p>
                      ) : regrasParaPercentual.map(r => {
                        const id = r.grupo_politica_id || r.id
                        const marcada = form.regra_ids.includes(id)
                        return (
                          <div key={id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer min-w-0">
                              <input type="checkbox" checked={marcada} onChange={() => toggleRegraPct(id)} className="w-3.5 h-3.5" />
                              <span className="font-mono font-semibold text-slate-400 shrink-0">{r.codigo_politica || '—'}</span>
                              <span className={`truncate ${marcada ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{r.descricao_comissao}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{r.pj_variaveis ? 'Variáveis' : `Fixo ${fmtBRL(r.comissao_valor)}`}</span>
                            </label>
                            {marcada && form.pj_valor_diferente && (
                              <div className="flex items-center gap-1 shrink-0">
                                <input type="number" min="0.01" step="0.01" required value={form.pctPorRegra[id] ?? ''}
                                  onChange={ev => setForm(f => ({ ...f, pctPorRegra: { ...f.pctPorRegra, [id]: ev.target.value } }))}
                                  placeholder="0,00" className="w-24 text-xs p-1.5 border border-slate-200 rounded-md text-right font-mono" />
                                <span className="text-slate-400">%</span>
                              </div>
                            )}
                            {marcada && !form.pj_valor_diferente && (
                              <span className="font-mono text-slate-500 shrink-0">{numero(form.pct_igual)}%</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {form.tipo === 'VARIAVEIS' && (
                  <div className="rounded-md border border-slate-200 p-3 space-y-2">
                    <label className={LBL}>Comissões que entram nas Variáveis <span className="text-red-500">*</span></label>
                    <p className="text-[11px] text-slate-400">No Processamento de Comissões, as comissões marcadas viram uma linha só com o valor total (o Visualizar mostra de onde vem cada valor). Prestadores de Serviços continua igual.</p>
                    <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {comissoesDisponiveis.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-400">Nenhuma política de comissão cadastrada.</p>
                      ) : comissoesDisponiveis.map(({ id, codigo, descricao }) => (
                        <label key={id} className="flex items-start gap-2 px-3 py-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={form.pj_politica_ids.includes(id)} onChange={() => toggleComissao(id)} className="w-3.5 h-3.5 mt-0.5" />
                          <span className="font-mono font-semibold text-slate-400 w-20 shrink-0">{codigo || '—'}</span>
                          <span className="text-slate-700">{descricao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empresas que pagam a prestação: mesmo valor pra todas ou um valor por empresa */}
                {form.tipo === 'FIXO' && (
                <div className="rounded-md border border-slate-200 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className={LBL}>Empresas que pagam <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={!form.pj_valor_diferente} onChange={() => setForm(f => ({ ...f, pj_valor_diferente: false }))} />
                        Mesmo valor para todas
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={form.pj_valor_diferente} onChange={() => setForm(f => ({ ...f, pj_valor_diferente: true }))} />
                        Valor diferente por empresa
                      </label>
                    </div>
                  </div>

                  {!form.pj_valor_diferente && (
                    <div className="flex flex-col gap-1.5 w-56">
                      <label className={LBL}>Valor Fixo por Empresa (R$) <span className="text-red-500">*</span></label>
                      <input type="number" required min="0.01" step="0.01" value={form.comissao_valor}
                        onChange={e => setForm(f => ({ ...f, comissao_valor: e.target.value }))}
                        placeholder="0,00" className={`${INP} text-right font-mono`} />
                    </div>
                  )}

                  <div className="rounded-md border border-slate-100 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    <label className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={todasMarcadas} onChange={marcarTodas} className="w-3.5 h-3.5" />
                      Todas as empresas
                    </label>
                    {empresasPagadoras.map(e => {
                      const marcada = form.empresa_ids.includes(e.id)
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer min-w-0">
                            <input type="checkbox" checked={marcada} onChange={() => toggleEmpresa(e.id)} className="w-3.5 h-3.5" />
                            <span className={`truncate ${marcada ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{nomeEmpresa(e)}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{e.agrupamento_nome}</span>
                          </label>
                          {marcada && (form.pj_valor_diferente ? (
                            <input type="number" min="0.01" step="0.01" required value={form.valoresEmpresa[e.id] ?? ''}
                              onChange={ev => setForm(f => ({ ...f, valoresEmpresa: { ...f.valoresEmpresa, [e.id]: ev.target.value } }))}
                              placeholder="0,00" className="w-32 text-xs p-1.5 border border-slate-200 rounded-md text-right font-mono" />
                          ) : (
                            <span className="font-mono text-slate-500 shrink-0">{fmtBRL(numero(form.comissao_valor))}</span>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-700">Total da prestação ({form.empresa_ids.length} empresa{form.empresa_ids.length === 1 ? '' : 's'})</span>
                    <span className="font-mono font-bold text-emerald-700">{fmtBRL(totalPrestacao)}</span>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tipo do Processo</label>
                    <select value={form.tipo_processo} onChange={e => setForm(f => ({ ...f, tipo_processo: e.target.value }))} className={SEL}>
                      <option value="">—</option>
                      {tiposProcesso.map(t => <option key={t.id || t.codigo} value={t.codigo}>{t.codigo} — {t.descricao}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Início</label>
                    <input type="date" value={form.vig_inicio} onChange={e => setForm(f => ({ ...f, vig_inicio: e.target.value }))} className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Fim</label>
                    <input type="date" value={form.vig_fim} onChange={e => setForm(f => ({ ...f, vig_fim: e.target.value }))} className={INP} />
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={form.exige_documentos} onChange={e => setForm(f => ({ ...f, exige_documentos: e.target.checked }))} className="w-4 h-4" />
                    <Paperclip className="h-3.5 w-3.5 text-blue-600" /> Exige anexar documentos
                  </label>
                  {form.exige_documentos && (
                    <>
                      <p className="text-[11px] text-slate-500">Todo mês, em Prestadores de Serviços, cada documento abaixo precisa ser anexado para o prestador — sem eles o Conferir Comissões fica bloqueado.</p>
                      {form.documentos.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-5 text-right">{i + 1}.</span>
                          <input type="text" value={d} placeholder="Nome do documento (ex: Boleto Unimed)"
                            onChange={e => setForm(f => ({ ...f, documentos: f.documentos.map((x, j) => j === i ? e.target.value : x) }))}
                            className={INP} />
                          {form.documentos.length > 1 && (
                            <button type="button" onClick={() => setForm(f => ({ ...f, documentos: f.documentos.filter((_, j) => j !== i) }))}
                              className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm(f => ({ ...f, documentos: [...f.documentos, ''] }))}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                        <Plus className="h-3.5 w-3.5" /> Adicionar documento
                      </button>
                    </>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                  Regra ativa
                </label>

                {erroForm && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4" /> Erro ao salvar: {erroForm}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md">
                  {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
