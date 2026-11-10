import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, ListTree, AlertTriangle, CheckCircle2, Loader2, Plus as PlusIcon, RefreshCw, MinusCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import { INPUT, LABEL } from './ControladoriaNav'

// Importação do Plano de Contas exportado do DMS, para uma ou mais empresas:
//  • Dealer.net  → planilha REL_CNT_PLANOCONTA (.xlsx): PlanoConta_IDNivel (código), PlanoConta_Codigo
//    (reduzida), PlanoConta_Descricao, PlanoConta_Tipo (S/A), PlanoConta_Natureza (D/C).
//  • MicroWork   → relatório "LISTAGEM DO PLANO DE CONTAS" (.txt, largura fixa, Windows-1252):
//    Conta Analítica (código), Conta Reduzida, Conta Ref. ECD/ECF, Descrição. Não traz tipo nem
//    natureza: conta com reduzida = Analítica, sem = Sintética; natureza vem do grupo (1º dígito).
// Chave da conta (dentro da empresa): Dealer.net = PlanoConta_Codigo (conta reduzida) — o código
// IDNivel pode mudar ou se repetir; MicroWork = código + conta reduzida.
// Compara, em cada empresa marcada, com o que já existe nela:
// Novo (cria), Atualizar (muda código/descrição/tipo/natureza/referencial/conta pai), Igual (nada).
// Tipo de Conta (DRE/Balanço) e Ativo nunca são alterados pela importação; conta que sumiu do arquivo só é listada.
// Conta nova recebe o Tipo de Conta pelo grupo: 1 Ativo / 2 Passivo = Balanço; 3 / 4 = DRE; demais em branco.

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const soDigitos = (v) => String(v ?? '').replace(/\D/g, '')
const chaveDe = (codigo, reduzida) => `${codigo}|${reduzida || ''}`
// Chave de comparação por sistema (ver cabeçalho).
const chaveSistema = (sistema, codigo, reduzida) => sistema === 'Dealer.net' ? `R|${reduzida || ''}` : chaveDe(codigo, reduzida)

// Natureza pelo grupo no MicroWork (o .txt não traz): 1 Ativo, 4 Custos/Despesas e 7 Compensação
// Ativa = Devedora; 2 Passivo, 3 Receita, 6 Encerramento e 8 Compensação Passiva = Credora.
const NATUREZA_GRUPO = { 1: 'DEVEDORA', 2: 'CREDORA', 3: 'CREDORA', 4: 'DEVEDORA', 5: 'DEVEDORA', 6: 'CREDORA', 7: 'DEVEDORA', 8: 'CREDORA', 9: 'DEVEDORA' }
const DEMONSTRATIVO_GRUPO = { 1: 'BALANCO', 2: 'BALANCO', 3: 'DRE', 4: 'DRE' }

// Dealer.net: pai = código sem o último segmento (1.1.1.01.01.001 → 1.1.1.01.01 → ...).
function ancestraisDealer(codigo) {
  const p = codigo.split('.')
  const lista = []
  while (p.length > 1) { p.pop(); lista.push(p.join('.')) }
  return lista
}
// MicroWork: código de tamanho fixo; pai = zera o último segmento não zerado (1.1.1.02.001 → 1.1.1.02.000 → 1.1.1.00.000 ...).
function ancestraisMicroWork(codigo) {
  const p = codigo.split('.')
  const lista = []
  for (let i = p.length - 1; i > 0; i--) {
    if (/^0+$/.test(p[i])) continue
    p[i] = '0'.repeat(p[i].length)
    lista.push(p.join('.'))
  }
  return lista
}

function lerDealer(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false })
  if (raw.length === 0) throw new Error('A planilha está vazia.')
  if (!('PlanoConta_IDNivel' in raw[0]) || !('PlanoConta_Descricao' in raw[0])) {
    throw new Error('Planilha não reconhecida: esperado o relatório de Plano de Contas do Dealer.net (colunas PlanoConta_IDNivel, PlanoConta_Codigo, PlanoConta_Descricao, PlanoConta_Tipo, PlanoConta_Natureza).')
  }
  return raw.map(r => ({
    codigo: norm(r.PlanoConta_IDNivel),
    reduzida: norm(r.PlanoConta_Codigo),
    referencial: null,
    descricao: norm(r.PlanoConta_Descricao),
    tipo: norm(r.PlanoConta_Tipo).toUpperCase() === 'S' ? 'SINTETICA' : 'ANALITICA',
    natureza: norm(r.PlanoConta_Natureza).toUpperCase() === 'C' ? 'CREDORA' : 'DEVEDORA',
    ancestrais: ancestraisDealer(norm(r.PlanoConta_IDNivel)),
  })).filter(r => r.codigo && r.descricao)
}

function lerMicroWork(buffer) {
  const texto = new TextDecoder('windows-1252').decode(buffer)
  if (!/PLANO DE CONTAS/i.test(texto)) throw new Error('Arquivo .txt não reconhecido: esperado o relatório "Listagem do Plano de Contas" do MicroWork.')
  const cnpj = texto.match(/C\.N\.P\.J\.:\s*([\d./-]+)/)?.[1] || null
  // Código (1.1.1.02.001) · reduzida (000103, opcional) · referencial ECD/ECF (1.01.01.02.01, opcional) · descrição
  const re = /^\s*(\d(?:\.\d+)+)\s{2,}(?:(\d+)\s+)?(?:(\d+(?:\.\d+)+)\s+)?(\S.*?)\s*$/
  const linhas = []
  for (const l of texto.split(/\r?\n/)) {
    const m = l.match(re)
    if (!m) continue
    const reduzida = m[2] || null
    linhas.push({
      codigo: m[1],
      reduzida,
      referencial: m[3] || null,
      descricao: norm(m[4]),
      tipo: reduzida ? 'ANALITICA' : 'SINTETICA',
      natureza: NATUREZA_GRUPO[m[1][0]] || 'DEVEDORA',
      ancestrais: ancestraisMicroWork(m[1]),
    })
  }
  if (linhas.length === 0) throw new Error('Nenhuma conta encontrada no relatório.')
  return { linhas, cnpj }
}

const STATUS = {
  novo: { label: 'Novo', chip: 'bg-blue-50 text-blue-700 border-blue-200', icon: PlusIcon },
  atualizar: { label: 'Atualizar', chip: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  igual: { label: 'Igual', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  fora: { label: 'Fora do arquivo', chip: 'bg-slate-100 text-slate-500 border-slate-200', icon: MinusCircle },
}

// Classificação do arquivo contra as contas de UMA empresa.
function analisar(arquivo, existentes) {
  const chave = (codigo, reduzida) => chaveSistema(arquivo.sistema, codigo, reduzida)
  const exPorChave = new Map(existentes.map(c => [chave(c.codigo, c.conta_reduzida), c]))
  const exPorId = new Map(existentes.map(c => [c.id, c]))
  // Código → conta pai candidata (prefere Sintética quando o código se repete).
  const exPorCodigo = new Map()
  for (const c of existentes) if (!exPorCodigo.has(c.codigo) || c.tipo === 'SINTETICA') exPorCodigo.set(c.codigo, c)
  const codigosArquivo = new Set(arquivo.linhas.map(l => l.codigo))
  const ehMicroWork = arquivo.sistema === 'MicroWork'

  const linhas = arquivo.linhas.map(l => {
    // Pai = ancestral mais próximo que existe no arquivo ou já no cadastro.
    const paiCodigo = l.ancestrais.find(a => codigosArquivo.has(a) || exPorCodigo.has(a)) || null
    const atual = exPorChave.get(chave(l.codigo, l.reduzida))
    if (!atual) return { ...l, paiCodigo, status: 'novo', mudancas: [] }
    const mudancas = []
    // Dealer.net identifica pela conta reduzida: se o código mudou no DMS, atualiza o código.
    if (atual.codigo !== l.codigo) mudancas.push({ campo: 'codigo', de: atual.codigo, para: l.codigo })
    if (atual.descricao !== l.descricao) mudancas.push({ campo: 'descricao', de: atual.descricao, para: l.descricao })
    if (atual.tipo !== l.tipo) mudancas.push({ campo: 'tipo', de: atual.tipo, para: l.tipo })
    // MicroWork não traz natureza (é deduzida): não sobrescreve o que estiver cadastrado.
    if (!ehMicroWork && atual.natureza !== l.natureza) mudancas.push({ campo: 'natureza', de: atual.natureza, para: l.natureza })
    if (ehMicroWork && (atual.conta_referencial || null) !== l.referencial) mudancas.push({ campo: 'conta_referencial', de: atual.conta_referencial, para: l.referencial })
    // Pai que só existe no arquivo (vai ser criado agora) conta como mudança.
    const paiNovoId = paiCodigo ? (exPorCodigo.get(paiCodigo)?.id ?? 'a-criar') : null
    if (paiNovoId !== (atual.conta_pai_id || null)) {
      mudancas.push({ campo: 'conta_pai', de: exPorId.get(atual.conta_pai_id)?.codigo || null, para: paiCodigo })
    }
    return { ...l, paiCodigo, atual, status: mudancas.length ? 'atualizar' : 'igual', mudancas }
  })
  const chavesArquivo = new Set(arquivo.linhas.map(l => chave(l.codigo, l.reduzida)))
  const fora = existentes
    .filter(c => !chavesArquivo.has(chave(c.codigo, c.conta_reduzida)))
    .map(c => ({ codigo: c.codigo, reduzida: c.conta_reduzida, descricao: c.descricao, tipo: c.tipo, status: 'fora', mudancas: [] }))
  const contagem = { novo: 0, atualizar: 0, igual: 0, fora: fora.length }
  for (const l of linhas) contagem[l.status]++
  return { linhas, fora, contagem, pendentes: contagem.novo + contagem.atualizar }
}

// Grava a análise de UMA empresa: cria as novas por nível (pais antes dos filhos, já com a conta
// pai) e atualiza só os campos que mudaram nas existentes.
async function importarEmpresa({ empresaId, arquivo, existentes, analise, progresso }) {
  const erros = []
  let criados = 0
  let atualizados = 0
  try {
    const idPorCodigo = new Map()
    const registrar = (c) => { if (!idPorCodigo.has(c.codigo) || c.tipo === 'SINTETICA') idPorCodigo.set(c.codigo, c.id) }
    existentes.forEach(registrar)

    const novas = analise.linhas.filter(l => l.status === 'novo')
    // Tem que ser das linhas da análise (as do arquivo não trazem paiCodigo) — senão todas caem no nível 0
    // e são gravadas antes dos pais, ficando sem conta pai.
    const porCodigoArquivo = new Map()
    for (const l of analise.linhas) if (!porCodigoArquivo.has(l.codigo) || l.tipo === 'SINTETICA') porCodigoArquivo.set(l.codigo, l)
    const nivelCache = new Map()
    const nivel = (l, guarda = 0) => {
      if (nivelCache.has(l)) return nivelCache.get(l)
      const pai = l.paiCodigo ? porCodigoArquivo.get(l.paiCodigo) : null
      const n = pai && guarda < 30 ? nivel(pai, guarda + 1) + 1 : 0
      nivelCache.set(l, n)
      return n
    }
    const niveis = new Map()
    for (const l of novas) { const n = nivel(l); niveis.set(n, [...(niveis.get(n) || []), l]) }
    for (const n of [...niveis.keys()].sort((a, b) => a - b)) {
      progresso(`criando contas: ${criados} de ${novas.length}...`)
      const criadas = await apiService.inserirCtbPlanoContasLote(niveis.get(n).map(l => ({
        empresa_id: empresaId,
        codigo: l.codigo,
        descricao: l.descricao,
        tipo: l.tipo,
        natureza: l.natureza,
        demonstrativo: DEMONSTRATIVO_GRUPO[l.codigo[0]] || null,
        conta_reduzida: l.reduzida || null,
        conta_referencial: l.referencial || null,
        conta_pai_id: (l.paiCodigo && idPorCodigo.get(l.paiCodigo)) || null,
        ativo: true,
      })))
      criadas.forEach(registrar)
      criados += criadas.length
    }

    const mudar = analise.linhas.filter(l => l.status === 'atualizar')
    for (let i = 0; i < mudar.length; i += 10) {
      progresso(`atualizando contas: ${i} de ${mudar.length}...`)
      await Promise.all(mudar.slice(i, i + 10).map(async l => {
        const campos = {}
        for (const m of l.mudancas) {
          if (m.campo === 'conta_pai') campos.conta_pai_id = (l.paiCodigo && idPorCodigo.get(l.paiCodigo)) || null
          else campos[m.campo] = m.para
        }
        try {
          await apiService.atualizarCtbPlanoConta(l.atual.id, campos)
          atualizados++
        } catch (err) {
          erros.push(`${l.codigo} — ${l.descricao}: ${err.message || String(err)}`)
        }
      }))
    }
  } catch (err) {
    erros.push(err.message || String(err))
  }
  return { criados, atualizados, erros }
}

const nomeEmp = (e) => e ? `${e.codigo_empresa} — ${e.empresa_fantasia || e.nome_empresa}` : ''

export default function ImportarPlanoContasModal({ empresas, empresaInicial, onClose, onImported }) {
  const fileRef = useRef(null)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [arrastando, setArrastando] = useState(false)
  const [erroArquivo, setErroArquivo] = useState(null)
  const [arquivo, setArquivo] = useState(null) // { nome, sistema, cnpj, linhas, repetidos }
  const [empresaIds, setEmpresaIds] = useState(empresaInicial ? [empresaInicial] : [])
  const [planos, setPlanos] = useState({}) // empresaId → contas já cadastradas (cache)
  const [errosPlano, setErrosPlano] = useState({}) // empresaId → erro ao carregar
  const [empresaVista, setEmpresaVista] = useState('') // empresa cujo detalhe aparece na tabela
  const [agrupamento, setAgrupamento] = useState('') // filtra a lista de empresas ('' = todos)
  const [filtro, setFiltro] = useState('pendentes') // pendentes | novo | atualizar | igual | fora | todos
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState(null) // [{ empresaId, criados, atualizados, erros }]

  const empresasAtivas = useMemo(() => empresas.filter(e => e.ativo !== false), [empresas])
  const agrupamentos = useMemo(
    () => [...new Set(empresasAtivas.map(e => e.agrupamento_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [empresasAtivas]
  )
  const empresasListadas = useMemo(
    () => agrupamento ? empresasAtivas.filter(e => e.agrupamento_nome === agrupamento) : empresasAtivas,
    [empresasAtivas, agrupamento]
  )
  const empresaPorId = useMemo(() => Object.fromEntries(empresas.map(e => [e.id, e])), [empresas])
  // Mantém a ordem da lista de empresas, não a ordem em que foram marcadas.
  const selecionadas = useMemo(() => empresasAtivas.filter(e => empresaIds.includes(e.id)).map(e => e.id), [empresasAtivas, empresaIds])

  // Carrega o plano de cada empresa marcada (uma vez só por empresa).
  useEffect(() => {
    for (const id of selecionadas) {
      if (planos[id] || errosPlano[id] === 'carregando') continue
      setErrosPlano(p => ({ ...p, [id]: 'carregando' }))
      apiService.getCtbPlanoContas(id)
        .then(c => { setPlanos(p => ({ ...p, [id]: c })); setErrosPlano(p => ({ ...p, [id]: null })) })
        .catch(err => setErrosPlano(p => ({ ...p, [id]: err.message || String(err) })))
    }
  }, [selecionadas]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selecionadas.includes(empresaVista)) setEmpresaVista(selecionadas[0] || '')
  }, [selecionadas, empresaVista])

  const alternarEmpresa = (id) => setEmpresaIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result)
        const ehTxt = /\.txt$/i.test(file.name)
        let linhas, sistema, cnpj = null
        if (ehTxt) { ({ linhas, cnpj } = lerMicroWork(buffer)); sistema = 'MicroWork' }
        else { linhas = lerDealer(buffer); sistema = 'Dealer.net' }

        // Mesma chave (código + reduzida) duas vezes no arquivo: fica a primeira.
        const vistos = new Set()
        linhas = linhas.filter(l => { const k = chaveSistema(sistema, l.codigo, l.reduzida); if (vistos.has(k)) return false; vistos.add(k); return true })
        // Mesmo código com reduzidas diferentes (acontece no Dealer.net): importa as duas, mas avisa.
        const porCodigo = new Map()
        for (const l of linhas) porCodigo.set(l.codigo, [...(porCodigo.get(l.codigo) || []), l])
        const repetidos = [...porCodigo.values()].filter(g => g.length > 1)

        linhas.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
        setArquivo({ nome: file.name, sistema, cnpj, linhas, repetidos })
        // MicroWork traz o CNPJ: já marca a empresa.
        if (cnpj) {
          const achada = empresasAtivas.find(emp => soDigitos(emp.cnpj) === soDigitos(cnpj))
          if (achada) setEmpresaIds(ids => ids.includes(achada.id) ? ids : [...ids, achada.id])
        }
        setFiltro('pendentes')
        setEtapa('preview')
      } catch (err) {
        setErroArquivo(err.message || String(err))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Uma análise por empresa marcada (null enquanto o plano dela carrega).
  const analises = useMemo(() => {
    if (!arquivo) return {}
    return Object.fromEntries(selecionadas.map(id => [id, planos[id] ? analisar(arquivo, planos[id]) : null]))
  }, [arquivo, selecionadas, planos])

  const carregando = selecionadas.some(id => !analises[id] && errosPlano[id] === 'carregando')
  const comErro = selecionadas.filter(id => !analises[id] && errosPlano[id] && errosPlano[id] !== 'carregando')
  const totalPendentes = selecionadas.reduce((s, id) => s + (analises[id]?.pendentes || 0), 0)
  const podeImportar = selecionadas.length > 0 && !carregando && comErro.length === 0 && totalPendentes > 0

  const analiseVista = analises[empresaVista]
  const visiveis = useMemo(() => {
    if (!analiseVista) return []
    if (filtro === 'fora') return analiseVista.fora
    if (filtro === 'todos') return analiseVista.linhas
    if (filtro === 'pendentes') return analiseVista.linhas.filter(l => l.status !== 'igual')
    return analiseVista.linhas.filter(l => l.status === filtro)
  }, [analiseVista, filtro])

  const handleImportar = async () => {
    setEtapa('importando')
    const saida = []
    for (const id of selecionadas) {
      const analise = analises[id]
      if (!analise || analise.pendentes === 0) { saida.push({ empresaId: id, criados: 0, atualizados: 0, erros: [] }); continue }
      const nome = nomeEmp(empresaPorId[id])
      const r = await importarEmpresa({
        empresaId: id, arquivo, existentes: planos[id], analise,
        progresso: (txt) => setProgresso(`${nome}: ${txt}`),
      })
      saida.push({ empresaId: id, ...r })
    }
    const alterou = saida.find(r => r.criados > 0 || r.atualizados > 0)
    if (alterou) onImported?.(alterou.empresaId)
    setResultado(saida)
    setEtapa('resultado')
  }

  const rotuloCampo = { codigo: 'Código', descricao: 'Descrição', tipo: 'Tipo', natureza: 'Natureza', conta_referencial: 'Ref. ECD/ECF', conta_pai: 'Conta pai' }
  const fmt = (v) => v === 'SINTETICA' ? 'Sintética' : v === 'ANALITICA' ? 'Analítica' : v === 'DEVEDORA' ? 'Devedora' : v === 'CREDORA' ? 'Credora' : (v || '—')
  const totalErros = resultado ? resultado.reduce((s, r) => s + r.erros.length, 0) : 0

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[900px] max-w-[95vw] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ListTree className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Plano de Contas</h2>
              <p className="text-[11px] text-slate-500">Dealer.net (planilha .xlsx) ou MicroWork (relatório .txt) — o plano é gravado em cada empresa marcada.</p>
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
                <p className="text-sm font-semibold text-slate-700">Arraste o arquivo do Plano de Contas aqui</p>
                <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — .xlsx (Dealer.net) / .txt (MicroWork)</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.txt" className="hidden" onChange={(e) => { processarArquivo(e.target.files[0]); e.target.value = '' }} />
              </div>
              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dealer.net — .xlsx</p>
                  <p className="text-[11px] text-slate-500">Relatório REL_CNT_PLANOCONTA. Usa código (IDNivel), conta reduzida, descrição, tipo (S/A) e natureza (D/C).</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">MicroWork — .txt</p>
                  <p className="text-[11px] text-slate-500">Listagem do Plano de Contas. Usa conta analítica, reduzida, referencial ECD/ECF e descrição; a empresa do CNPJ do relatório já vem marcada.</p>
                </div>
              </div>
            </>
          )}

          {etapa === 'preview' && arquivo && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>{arquivo.nome}</strong> — {arquivo.sistema}, {arquivo.linhas.length} conta(s)
                  {arquivo.cnpj && <> · CNPJ {arquivo.cnpj}</>}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <label className={LABEL}>Empresas * <span className="normal-case font-semibold text-slate-400">({selecionadas.length} marcada(s))</span></label>
                  {/* Agrupamento filtra a lista; "Marcar todas" marca as empresas que estão aparecendo. */}
                  <select value={agrupamento} onChange={e => setAgrupamento(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto py-1 pr-7 ml-auto`}>
                    <option value="">Todos os agrupamentos</option>
                    {agrupamentos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button type="button" onClick={() => setEmpresaIds(ids => [...new Set([...ids, ...empresasListadas.map(e => e.id)])])} className="text-[11px] font-semibold text-blue-600 hover:underline whitespace-nowrap">Marcar todas</button>
                  {selecionadas.length > 0 && (
                    <button type="button" onClick={() => setEmpresaIds([])} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline whitespace-nowrap">Desmarcar todas</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 border border-slate-200 rounded-lg p-2.5 max-h-44 overflow-y-auto">
                  {empresasListadas.map(e => (
                    <label key={e.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                      <input type="checkbox" checked={empresaIds.includes(e.id)} onChange={() => alternarEmpresa(e.id)} className="w-3.5 h-3.5" />
                      <span className="font-medium truncate">{nomeEmp(e)}</span>
                      {e.sistema_dms && <span className="text-[10px] text-slate-400 shrink-0">{e.sistema_dms}</span>}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {arquivo.sistema === 'Dealer.net'
                    ? 'Em cada empresa compara pela PlanoConta_Codigo (conta reduzida): cria o que não existe e atualiza código, descrição, tipo, natureza e conta pai.'
                    : 'Em cada empresa compara Código + Conta Reduzida: cria o que não existe e atualiza descrição, tipo, referencial ECD/ECF e conta pai.'} Conta nova já recebe o Tipo de Conta pelo grupo (1 e 2 = Balanço Patrimonial, 3 e 4 = DRE); nas existentes, Tipo de Conta e Situação não são alterados.
                  {arquivo.sistema === 'MicroWork' && ' A natureza das contas novas vem do grupo (1 Ativo e 4 Custos = Devedora; 2 Passivo e 3 Receita = Credora), pois o relatório não traz.'}
                </p>
              </div>

              {/* Dealer.net identifica pela conta reduzida: código repetido lá não atrapalha, não avisa. */}
              {arquivo.sistema !== 'Dealer.net' && arquivo.repetidos.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Contas diferentes com o mesmo código no {arquivo.sistema}</p>
                  <p className="text-[11px] text-amber-800">Todas serão importadas (a conta reduzida diferencia uma da outra). Se quiser corrigir, ajuste o código delas no {arquivo.sistema} e importe de novo.</p>
                  {arquivo.repetidos.map(g => (
                    <div key={g[0].codigo} className="text-[11px] text-amber-900 pl-2 border-l-2 border-amber-300">
                      <span className="font-mono font-bold">{g[0].codigo}</span> está em {g.length} contas:
                      {g.map(l => <div key={l.reduzida} className="pl-3">reduzida <span className="font-mono">{l.reduzida}</span> — {l.descricao}</div>)}
                    </div>
                  ))}
                </div>
              )}

              {selecionadas.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">Marque uma ou mais empresas para ver o que será criado e atualizado em cada uma.</div>
              ) : (
                <>
                  {/* Resumo por empresa — clicar na linha mostra o detalhe dela abaixo. */}
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                          <th className="p-2">Empresa</th>
                          {['novo', 'atualizar', 'igual', 'fora'].map(s => <th key={s} className="p-2 w-24 text-center">{STATUS[s].label}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selecionadas.map(id => {
                          const a = analises[id]
                          const erro = errosPlano[id]
                          const vista = id === empresaVista
                          return (
                            <tr key={id} onClick={() => setEmpresaVista(id)} className={`cursor-pointer text-[11px] ${vista ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                              <td className={`p-2 font-semibold ${vista ? 'text-blue-700' : 'text-slate-700'}`}>{nomeEmp(empresaPorId[id])}</td>
                              {a ? ['novo', 'atualizar', 'igual', 'fora'].map(s => (
                                <td key={s} className={`p-2 text-center font-bold ${a.contagem[s] ? '' : 'text-slate-300'}`}>{a.contagem[s]}</td>
                              )) : (
                                <td colSpan="4" className="p-2 text-center">
                                  {erro && erro !== 'carregando'
                                    ? <span className="text-red-600">Erro ao carregar: {erro}</span>
                                    : <span className="text-slate-400 inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> comparando...</span>}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {analiseVista && (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="text-[11px] font-bold text-slate-700 mr-1">{nomeEmp(empresaPorId[empresaVista])}:</span>
                        {['novo', 'atualizar', 'igual', 'fora'].map(s => {
                          const { label, chip, icon: Icon } = STATUS[s]
                          const ativo = filtro === s
                          return (
                            <button key={s} type="button" onClick={() => setFiltro(ativo ? 'pendentes' : s)} disabled={!analiseVista.contagem[s]}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border transition ${chip} ${ativo ? 'ring-2 ring-offset-1 ring-blue-400' : ''} disabled:opacity-40`}>
                              <Icon className="h-3 w-3" /> {analiseVista.contagem[s]} {label.toLowerCase()}
                            </button>
                          )
                        })}
                        <button type="button" onClick={() => setFiltro(filtro === 'todos' ? 'pendentes' : 'todos')} className="ml-auto text-[11px] font-semibold text-blue-600 hover:underline">
                          {filtro === 'todos' ? 'Mostrar só o que muda' : 'Mostrar todas do arquivo'}
                        </button>
                      </div>
                      {analiseVista.contagem.fora > 0 && (
                        <p className="text-[11px] text-slate-400">{analiseVista.contagem.fora} conta(s) cadastrada(s) nesta empresa não estão no arquivo — não são excluídas; ficam como estão.</p>
                      )}

                      <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0">
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                              <th className="p-2 w-36">Código</th>
                              <th className="p-2 w-20">Reduzida</th>
                              <th className="p-2">Descrição</th>
                              <th className="p-2 w-20">Tipo</th>
                              <th className="p-2 w-28">Situação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {visiveis.length === 0 ? (
                              <tr><td colSpan="5" className="p-4 text-center text-[11px] text-slate-400">{filtro === 'pendentes' ? 'Nada a criar ou atualizar: o plano desta empresa já está igual ao arquivo.' : 'Nenhuma conta.'}</td></tr>
                            ) : visiveis.map(l => (
                              <tr key={`${l.status}|${chaveDe(l.codigo, l.reduzida)}`} className={l.status === 'igual' || l.status === 'fora' ? 'opacity-60' : ''}>
                                <td className="p-2 text-[11px] font-mono text-slate-600">{l.codigo}</td>
                                <td className="p-2 text-[11px] font-mono text-slate-500">{l.reduzida || '—'}</td>
                                <td className="p-2 text-[11px] text-slate-800">
                                  <span className={l.tipo === 'SINTETICA' ? 'font-bold' : 'font-medium'}>{l.descricao}</span>
                                  {l.mudancas.map(m => (
                                    <div key={m.campo} className="text-[10px] text-amber-700">{rotuloCampo[m.campo]}: <span className="line-through text-slate-400">{fmt(m.de)}</span> → {fmt(m.para)}</div>
                                  ))}
                                </td>
                                <td className="p-2 text-[11px] text-slate-500">{fmt(l.tipo)}</td>
                                <td className="p-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS[l.status].chip}`}>{STATUS[l.status].label}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando plano de contas...</p>
              <p className="text-xs text-slate-400">{progresso || 'Não feche esta janela.'}</p>
            </div>
          )}

          {etapa === 'resultado' && resultado && (
            <div className="space-y-3">
              <div className={`rounded-lg p-4 border flex items-start gap-3 ${totalErros ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                {totalErros ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
                <p className="text-sm font-bold text-slate-900">{totalErros ? 'Importação concluída com avisos' : 'Importação concluída'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {resultado.map(r => (
                  <div key={r.empresaId} className="p-3 space-y-1">
                    <p className="text-xs text-slate-700">
                      <strong>{nomeEmp(empresaPorId[r.empresaId])}</strong> — <strong>{r.criados}</strong> criada(s) · <strong>{r.atualizados}</strong> atualizada(s)
                    </p>
                    {r.erros.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 space-y-0.5 max-h-32 overflow-y-auto">
                        {r.erros.map((e, i) => <p key={i} className="text-[11px] text-red-700">{e}</p>)}
                      </div>
                    )}
                  </div>
                ))}
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
              <button onClick={() => { setEtapa('selecao'); setArquivo(null) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              {selecionadas.length === 0 && <span className="text-[11px] text-amber-600 font-semibold">Marque ao menos uma empresa</span>}
              <button
                onClick={handleImportar}
                disabled={!podeImportar}
                className={`px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${!podeImportar ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                Importar {totalPendentes > 0 ? `(${totalPendentes}${selecionadas.length > 1 ? ` em ${selecionadas.length} empresas` : ''})` : ''}
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
