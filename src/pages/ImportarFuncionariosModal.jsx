import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight, RefreshCw, Plus as PlusIcon, HelpCircle,
  Search, CheckSquare, Square, UserX,
} from 'lucide-react'
import { apiService } from '../services/api'

const soDigitos = (v) => String(v || '').replace(/\D/g, '')
const norm = (v) => String(v ?? '').trim()

// Colunas literais do export do ERP (mesmo arquivo usado na importação de Cargos).
const COL_CODIGO = 'i_empregados'
const COL_NOME = 'nome'
const COL_CPF = 'cpf'
const COL_CNPJ = 'cgce_emp'
const COL_CARGO = 'i_cargos'
const COL_CARGO_NOME = 'nome_cargo'
const COL_ADMISSAO = 'admissao'
const COL_SITUACAO = 'situacao'

const SITUACAO_DEMITIDO = '8'
const SITUACAO_LABEL = {
  '1': 'Trabalhando', '2': 'Direitos Integrais', '3': 'Acid. Trabalho', '4': 'Serviço Militar',
  '5': 'Licença Maternidade', '6': 'Doença', '7': 'Licença s/ Vencimento', '8': 'Demitido',
  '9': 'Férias', '10': 'Acid. Trabalho', '11': 'Licença Maternidade', '12': 'Doença',
  '13': 'Mandato Sindical', '14': 'Aposent. Invalidez', '15': 'Aposent. Invalidez', '16': 'Aposent. Invalidez',
  '17': 'Acid. Trabalho', '18': 'Doença', '19': 'Licença Médica', '20': 'Licença Maternidade',
  '21': 'Licença Maternidade', '22': 'Licença Maternidade', '24': 'Afastado',
}
const situacaoLabel = (codigo) => SITUACAO_LABEL[norm(codigo)] || (codigo ? `Código ${codigo}` : '—')

const parseDataBR = (s) => {
  const m = norm(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

// ── Modo "Atualizar Demissões" — relatório "RELAÇÃO DE EMPREGADOS ADMITIDOS E DEMITIDOS" do
// ERP: mistura os dois tipos de registro num arquivo só, diferenciados pela coluna "tipo"
// ('1' = demitido, tem data de demissão preenchida; '2' = admitido, sem demissão — ignorado
// aqui). Tem CNPJ (cgce_emp), então casa empresa+código igual ao modo Cadastro — mais
// confiável que o relatório anterior (que só tinha nome de empresa, sem CNPJ).
const COL_DEM_CNPJ = 'cgce_emp'
const COL_DEM_CODIGO = 'i_empregados'
const COL_DEM_NOME = 'nome'
const COL_DEM_DATA = 'demissao'
const COL_DEM_TIPO = 'tipo'
const TIPO_DEMITIDO = '1'

function construirLinhasDemissao(excelRows, funcionarios, empresas) {
  const vistos = new Set()
  const unicos = []
  for (const r of excelRows) {
    if (norm(r[COL_DEM_TIPO]) !== TIPO_DEMITIDO) continue
    const cnpj = soDigitos(r[COL_DEM_CNPJ])
    const codigo = norm(r[COL_DEM_CODIGO])
    const nome = norm(r[COL_DEM_NOME])
    if (!cnpj || !codigo) continue
    const key = `${cnpj}|${codigo}`
    if (vistos.has(key)) continue
    vistos.add(key)
    unicos.push({ key, cnpj, codigo, nome, dataDemissao: parseDataBR(r[COL_DEM_DATA]) })
  }
  unicos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  return unicos.map(u => {
    const empresa = empresas.find(e => soDigitos(e.cnpj) === u.cnpj)
    if (!empresa) return { ...u, status: 'empresa_nao_encontrada' }
    const empresaNome = empresa.empresa_fantasia || empresa.nome_empresa || '—'
    const base = { ...u, empresaId: empresa.id, empresaNome }

    const funcionario = funcionarios.find(f => f.empresa_id === empresa.id && norm(f.codigo_funcionario) === u.codigo)
    if (!funcionario) return { ...base, status: 'funcionario_nao_encontrado' }
    if (!u.dataDemissao) return { ...base, funcionarioId: funcionario.id, nomeAtual: funcionario.nome_funcionario, status: 'data_invalida' }

    const jaAtualizado = funcionario.situacao_funcionario === SITUACAO_DEMITIDO && funcionario.data_demissao === u.dataDemissao
    return {
      ...base,
      funcionarioId: funcionario.id,
      nomeAtual: funcionario.nome_funcionario,
      situacaoAtual: funcionario.situacao_funcionario,
      dataDemissaoAtual: funcionario.data_demissao,
      status: jaAtualizado ? 'ok' : 'demitir',
    }
  })
}

const STATUS_INFO_DEM = {
  demitir: { label: 'Marcar como demitido', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: UserX },
  ok: { label: 'Já atualizado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  funcionario_nao_encontrado: { label: 'Funcionário não encontrado', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: HelpCircle },
  empresa_nao_encontrada: { label: 'Empresa não encontrada', cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  data_invalida: { label: 'Data inválida na planilha', cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
}

// Monta as combinações únicas (CNPJ + Código do Funcionário) do Excel e classifica cada uma
// contra o que já existe no sistema — mesmo padrão da importação de Cargos, casando por
// empresa + código (CPF não serve de chave: a mesma pessoa pode ter mais de um vínculo ativo
// simultâneo em CNPJs diferentes, confirmado na planilha). Também calcula quem está ativo no
// sistema mas sumiu da planilha — candidato a desligamento.
function construirLinhas(excelRows, funcionarios, empresas, cargos) {
  const vistos = new Set()
  const unicos = []
  for (const r of excelRows) {
    const cnpj = soDigitos(r[COL_CNPJ])
    const codigo = norm(r[COL_CODIGO])
    const nome = norm(r[COL_NOME])
    if (!cnpj || !codigo || !nome) continue
    const key = `${cnpj}|${codigo}`
    if (vistos.has(key)) continue
    vistos.add(key)
    unicos.push({
      key, cnpj, codigo, nome,
      cpf: soDigitos(r[COL_CPF]),
      codigoCargo: norm(r[COL_CARGO]),
      cargoNomePlanilha: norm(r[COL_CARGO_NOME]),
      dataAdmissao: parseDataBR(r[COL_ADMISSAO]),
      situacao: norm(r[COL_SITUACAO]),
    })
  }
  unicos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const matchedIds = new Set()
  const linhas = unicos.map(u => {
    const empresa = empresas.find(e => soDigitos(e.cnpj) === u.cnpj)
    if (!empresa) return { ...u, status: 'empresa_nao_encontrada' }
    const empresaNome = empresa.empresa_fantasia || empresa.nome_empresa || '—'
    const cargo = cargos.find(c => c.empresa_id === empresa.id && norm(c.codigo_cargo) === u.codigoCargo)
    const existente = funcionarios.find(f => f.empresa_id === empresa.id && norm(f.codigo_funcionario) === u.codigo)
    if (existente) matchedIds.add(existente.id)

    const base = {
      ...u, empresaId: empresa.id, empresaNome,
      agrupamentoEmpresaId: empresa.agrupamento_empresa_id || null,
      cargoId: cargo?.id || '', cargoNome: cargo?.nome_cargo || '',
    }

    if (!cargo) {
      return { ...base, status: 'cargo_nao_encontrado', funcionarioExistenteId: existente?.id || null, cargoEscolhido: '' }
    }

    if (!existente) {
      return { ...base, status: 'novo' }
    }

    const diffs = []
    if (norm(existente.nome_funcionario) !== u.nome) diffs.push('nome')
    if (existente.cargo_id !== cargo.id) diffs.push('cargo')
    if (norm(existente.situacao_funcionario) !== u.situacao) diffs.push('situacao')
    if ((existente.data_admissao || '') !== (u.dataAdmissao || '')) diffs.push('admissao')
    if (existente.data_demissao) diffs.push('reativacao')
    if (u.cpf && soDigitos(existente.cpf) !== u.cpf) diffs.push('cpf')

    return {
      ...base,
      funcionarioExistenteId: existente.id,
      nomeAtual: existente.nome_funcionario,
      cargoAtualNome: existente.cargo_nome,
      situacaoAtual: existente.situacao_funcionario,
      status: diffs.length > 0 ? 'atualizar' : 'ok',
      diffs,
    }
  })

  const ausentes = funcionarios
    .filter(f => !f.data_demissao && f.situacao_funcionario !== SITUACAO_DEMITIDO && !matchedIds.has(f.id))
    .map(f => ({
      key: `ausente-${f.id}`,
      funcionarioId: f.id,
      nome: f.nome_funcionario,
      codigo: f.codigo_funcionario,
      empresaNome: f.empresa_nome,
      cargoNome: f.cargo_nome,
      dataDemissao: hojeISO(),
    }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

  return { linhas, ausentes }
}

const STATUS_INFO = {
  ok: { label: 'Já cadastrado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  atualizar: { label: 'Atualizar', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  novo: { label: 'Novo funcionário', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: PlusIcon },
  cargo_nao_encontrado: { label: 'Cargo não encontrado', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: HelpCircle },
  empresa_nao_encontrada: { label: 'Empresa não cadastrada', cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
}

const DIFF_LABEL = { nome: 'nome', cargo: 'cargo', situacao: 'situação', admissao: 'admissão', reativacao: 'reativação', cpf: 'cpf' }

// Deriva o Box a partir dos setores do cargo — mesmo critério usado no formulário manual
// (handleCargoChange em Funcionarios.jsx), pra não deixar boxes desalinhados num cadastro em lote.
const boxDoCargo = (cargo, boxes) => {
  const setorIds = cargo?.setor_ids || []
  if (setorIds.length === 0) return null
  return boxes.find(b => Array.isArray(b.setor_ids) && b.setor_ids.some(sid => setorIds.includes(sid))) || null
}

export default function ImportarFuncionariosModal({ funcionarios, empresas, cargos, boxes, onClose, onImported }) {
  const fileRef = useRef(null)
  // 'cadastro' = fluxo original (cria/atualiza cadastro + ausentes vira demitido); 'demissoes' =
  // outro relatório do ERP, só atualiza situação+data de demissão de quem já está cadastrado.
  const [modo, setModo] = useState('cadastro')
  const [arrastando, setArrastando] = useState(false)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState([])
  const [ausentes, setAusentes] = useState([])
  const [resultado, setResultado] = useState(null)

  const [selecionados, setSelecionados] = useState(new Set())
  const [selecionadosAusentes, setSelecionadosAusentes] = useState(new Set())
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [somentePendentes, setSomentePendentes] = useState(false)

  // Estado só do modo "Atualizar Demissões" — mantido separado do modo Cadastro (linhas/
  // selecionados acima) pra trocar de modo sem misturar resultado de uma planilha com a outra.
  const [linhasDem, setLinhasDem] = useState([])
  const [selecionadosDem, setSelecionadosDem] = useState(new Set())
  const [filtroTextoDem, setFiltroTextoDem] = useState('')
  const [filtroStatusDem, setFiltroStatusDem] = useState('')

  const importavel = (l) => l.status !== 'empresa_nao_encontrada' && l.status !== 'ok'
  const pendente = (l) => l.status === 'cargo_nao_encontrado' && !l.cargoEscolhido
  const importavelDem = (l) => l.status === 'demitir'

  const atualizarLinha = (key, campo, valor) =>
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, [campo]: valor } : l))
  const atualizarAusente = (key, campo, valor) =>
    setAusentes(prev => prev.map(a => a.key === key ? { ...a, [campo]: valor } : a))

  const linhasFiltradas = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase()
    return linhas.filter(l => {
      if (somentePendentes && !pendente(l)) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      if (!q) return true
      return `${l.empresaNome || ''} ${l.codigo} ${l.nome}`.toLowerCase().includes(q)
    })
  }, [linhas, filtroTexto, filtroStatus, somentePendentes])

  const toggleSelecionado = (key) => setSelecionados(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const todasFiltradasSelecionadas = linhasFiltradas.filter(importavel).length > 0 &&
    linhasFiltradas.filter(importavel).every(l => selecionados.has(l.key))
  const toggleSelecionarTodasFiltradas = () => setSelecionados(prev => {
    const next = new Set(prev)
    const alvo = linhasFiltradas.filter(importavel)
    if (todasFiltradasSelecionadas) alvo.forEach(l => next.delete(l.key))
    else alvo.forEach(l => next.add(l.key))
    return next
  })

  const toggleSelecionadoAusente = (key) => setSelecionadosAusentes(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const todasAusentesSelecionadas = ausentes.length > 0 && ausentes.every(a => selecionadosAusentes.has(a.key))
  const toggleSelecionarTodasAusentes = () => setSelecionadosAusentes(
    todasAusentesSelecionadas ? new Set() : new Set(ausentes.map(a => a.key))
  )

  const linhasDemFiltradas = useMemo(() => {
    const q = filtroTextoDem.trim().toLowerCase()
    return linhasDem.filter(l => {
      if (filtroStatusDem && l.status !== filtroStatusDem) return false
      if (!q) return true
      return `${l.empresaNome || ''} ${l.codigo} ${l.nome}`.toLowerCase().includes(q)
    })
  }, [linhasDem, filtroTextoDem, filtroStatusDem])

  const toggleSelecionadoDem = (key) => setSelecionadosDem(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const todasFiltradasSelecionadasDem = linhasDemFiltradas.filter(importavelDem).length > 0 &&
    linhasDemFiltradas.filter(importavelDem).every(l => selecionadosDem.has(l.key))
  const toggleSelecionarTodasFiltradasDem = () => setSelecionadosDem(prev => {
    const next = new Set(prev)
    const alvo = linhasDemFiltradas.filter(importavelDem)
    if (todasFiltradasSelecionadasDem) alvo.forEach(l => next.delete(l.key))
    else alvo.forEach(l => next.add(l.key))
    return next
  })

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (raw.length === 0) {
          setErroArquivo('O arquivo está vazio ou não possui dados.')
          return
        }
        const cabecalho = Object.keys(raw[0])

        if (modo === 'demissoes') {
          const faltandoDem = [COL_DEM_CNPJ, COL_DEM_CODIGO, COL_DEM_NOME, COL_DEM_DATA, COL_DEM_TIPO].filter(c => !cabecalho.includes(c))
          if (faltandoDem.length > 0) {
            setErroArquivo(`Colunas não encontradas no arquivo:\n${faltandoDem.join(', ')}`)
            return
          }
          const construidasDem = construirLinhasDemissao(raw, funcionarios, empresas)
          if (construidasDem.length === 0) {
            setErroArquivo('Nenhuma combinação válida de empresa + código de funcionário encontrada no arquivo.')
            return
          }
          setLinhasDem(construidasDem)
          setSelecionadosDem(new Set())
          setFiltroTextoDem('')
          setFiltroStatusDem('')
          setEtapa('preview')
          return
        }

        const faltando = [COL_CNPJ, COL_CODIGO, COL_NOME, COL_CARGO].filter(c => !cabecalho.includes(c))
        if (faltando.length > 0) {
          setErroArquivo(`Colunas não encontradas no arquivo:\n${faltando.join(', ')}`)
          return
        }

        const { linhas: construidas, ausentes: ausentesCalc } = construirLinhas(raw, funcionarios, empresas, cargos)
        if (construidas.length === 0) {
          setErroArquivo('Nenhuma combinação válida de empresa + código de funcionário encontrada no arquivo.')
          return
        }
        setLinhas(construidas)
        setAusentes(ausentesCalc)
        setSelecionados(new Set())
        setSelecionadosAusentes(new Set())
        setFiltroTexto('')
        setFiltroStatus('')
        setSomentePendentes(false)
        setEtapa('preview')
      } catch (err) {
        setErroArquivo('Erro ao processar o arquivo: ' + (err.message || String(err)))
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleFileInput = (e) => processarArquivo(e.target.files[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setArrastando(false)
    processarArquivo(e.dataTransfer.files[0])
  }

  const linhasSelecionadas = linhas.filter(l => selecionados.has(l.key))
  const pendentes = linhasSelecionadas.filter(pendente).length
  const prontasParaImportar = linhasSelecionadas.length - pendentes
  const ausentesSelecionados = ausentes.filter(a => selecionadosAusentes.has(a.key))

  const contagens = linhas.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const linhasDemSelecionadas = linhasDem.filter(l => selecionadosDem.has(l.key))
  const contagensDem = linhasDem.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const handleImportarDemissoes = async () => {
    setEtapa('importando')
    let demitidos = 0
    const erros = []
    for (const l of linhasDemSelecionadas) {
      try {
        await apiService.updateFuncionario(l.funcionarioId, {
          situacao_funcionario: SITUACAO_DEMITIDO,
          data_demissao: l.dataDemissao,
          ativo: false,
        })
        demitidos++
      } catch (err) {
        erros.push(`${l.nome} (código ${l.codigo}): ${err.message || String(err)}`)
      }
    }
    if (demitidos > 0) onImported?.()
    if (erros.length === 0) {
      onClose?.()
      return
    }
    setResultado({ atualizados: 0, criados: 0, demitidos, pendentesIgnorados: 0, erros })
    setEtapa('resultado')
  }

  const handleImportar = async () => {
    setEtapa('importando')
    let atualizados = 0
    let criados = 0
    let demitidos = 0
    let pendentesIgnorados = 0
    const erros = []

    for (const l of linhasSelecionadas) {
      try {
        if (pendente(l)) { pendentesIgnorados++; continue }

        const cargoId = l.cargoEscolhido || l.cargoId
        const cargoObj = cargos.find(c => c.id === cargoId)
        const cargoNome = cargoObj?.nome_cargo || l.cargoNome

        if (l.status === 'novo' || (l.status === 'cargo_nao_encontrado' && !l.funcionarioExistenteId)) {
          const box = boxDoCargo(cargoObj, boxes)
          let politica = null
          try { politica = await apiService.getPoliticaByCargoEmpresa(cargoId, l.agrupamentoEmpresaId) } catch { /* segue sem política */ }
          await apiService.createFuncionario({
            nome_funcionario: l.nome,
            codigo_funcionario: l.codigo,
            empresa_id: l.empresaId,
            empresa_nome: l.empresaNome,
            cargo_id: cargoId,
            cargo_nome: cargoNome,
            departamento_ids: cargoObj?.departamento_ids || [],
            setor_ids: cargoObj?.setor_ids || [],
            box_id: box?.id || null,
            box_nome: box?.nome_box || null,
            data_admissao: l.dataAdmissao,
            data_demissao: null,
            situacao_funcionario: l.situacao || null,
            recebe_comissao_ferias: false,
            politica_id: politica?.id || null,
            descricao_comissao: politica?.descricao_comissao || null,
            base_tipo: politica?.base_calculo?.nome || null,
            tipo_evento: politica?.fonte_calculo?.nome || null,
            nivel_calculo: politica?.nivel_calculo || null,
            comissao_servicos: politica?.comissao_servicos ?? null,
            comissao_pecas: politica?.comissao_pecas ?? null,
            comissao_total: politica?.comissao_total ?? null,
            comissao_valor: politica?.comissao_valor ?? null,
            cpf: l.cpf || null,
            ativo: true,
          })
          criados++
        } else {
          // 'atualizar' ou 'cargo_nao_encontrado' já vinculado — grava só o que realmente mudou.
          const payload = {}
          const diffs = l.diffs || (l.status === 'cargo_nao_encontrado' ? ['cargo'] : [])
          if (diffs.includes('nome')) payload.nome_funcionario = l.nome
          if (diffs.includes('cargo') || l.status === 'cargo_nao_encontrado') {
            payload.cargo_id = cargoId
            payload.cargo_nome = cargoNome
            payload.departamento_ids = cargoObj?.departamento_ids || []
            payload.setor_ids = cargoObj?.setor_ids || []
            const box = boxDoCargo(cargoObj, boxes)
            payload.box_id = box?.id || null
            payload.box_nome = box?.nome_box || null
            let politica = null
            try { politica = await apiService.getPoliticaByCargoEmpresa(cargoId, l.agrupamentoEmpresaId) } catch { /* segue sem política */ }
            payload.politica_id = politica?.id || null
            payload.descricao_comissao = politica?.descricao_comissao || null
            payload.base_tipo = politica?.base_calculo?.nome || null
            payload.tipo_evento = politica?.fonte_calculo?.nome || null
            payload.nivel_calculo = politica?.nivel_calculo || null
            payload.comissao_servicos = politica?.comissao_servicos ?? null
            payload.comissao_pecas = politica?.comissao_pecas ?? null
            payload.comissao_total = politica?.comissao_total ?? null
            payload.comissao_valor = politica?.comissao_valor ?? null
          }
          if (diffs.includes('situacao')) payload.situacao_funcionario = l.situacao || null
          if (diffs.includes('admissao')) payload.data_admissao = l.dataAdmissao
          if (diffs.includes('reativacao')) { payload.data_demissao = null; payload.ativo = true }
          if (diffs.includes('cpf')) payload.cpf = l.cpf
          if (Object.keys(payload).length > 0) {
            await apiService.updateFuncionario(l.funcionarioExistenteId, payload)
            atualizados++
          }
        }
      } catch (err) {
        erros.push(`${l.nome} (código ${l.codigo}): ${err.message || String(err)}`)
      }
    }

    for (const a of ausentesSelecionados) {
      try {
        await apiService.updateFuncionario(a.funcionarioId, {
          situacao_funcionario: SITUACAO_DEMITIDO,
          data_demissao: a.dataDemissao,
          ativo: false,
        })
        demitidos++
      } catch (err) {
        erros.push(`${a.nome} (demissão): ${err.message || String(err)}`)
      }
    }

    if (atualizados > 0 || criados > 0 || demitidos > 0) onImported?.()

    // Sem erros: fecha direto, o resultado já foi aplicado. Com erros, mostra a tela de
    // resultado pra não esconder o que precisa de atenção manual.
    if (erros.length === 0) {
      onClose?.()
      return
    }
    setResultado({ atualizados, criados, demitidos, pendentesIgnorados, erros })
    setEtapa('resultado')
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[960px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {modo === 'demissoes' ? 'Atualizar Demissões via Excel' : 'Importar Funcionários via Excel'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {modo === 'demissoes'
                  ? 'Casa Empresa + Código do Funcionário da planilha de demitidos e atualiza situação + data de demissão de quem já está cadastrado.'
                  : 'Compara CNPJ + Código do Funcionário da planilha com o cadastro atual e resolve as diferenças.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Escolha do modelo de planilha — só antes de escolher o arquivo. */}
          {etapa === 'selecao' && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => { setModo('cadastro'); setErroArquivo(null) }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${modo === 'cadastro' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Atualizar Cadastro
              </button>
              <button
                type="button"
                onClick={() => { setModo('demissoes'); setErroArquivo(null) }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${modo === 'demissoes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Atualizar Demissões
              </button>
            </div>
          )}

          {/* ── ETAPA: seleção ── */}
          {etapa === 'selecao' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${arrastando ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
              >
                <Upload className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Arraste o arquivo Excel aqui</p>
                <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — .xlsx / .xls</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
              </div>

              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas obrigatórias (export do ERP)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(modo === 'demissoes' ? [COL_DEM_CNPJ, COL_DEM_CODIGO, COL_DEM_NOME, COL_DEM_DATA, COL_DEM_TIPO] : [COL_CNPJ, COL_CODIGO, COL_NOME, COL_CARGO]).map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">{c}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── ETAPA: preview (Cadastro) ── */}
          {etapa === 'preview' && modo === 'cadastro' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700"><strong>{nomeArquivo}</strong> — {linhas.length} combinação(ões) de empresa + código encontradas</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_INFO).map(([key, info]) => contagens[key] ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroStatus(prev => prev === key ? '' : key)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-shadow ${info.cls} ${filtroStatus === key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                  >
                    <info.icon className="h-3 w-3" /> {contagens[key]} {info.label.toLowerCase()}
                  </button>
                ) : null)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar por empresa, código ou nome..."
                    className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {filtroStatus && (
                  <button onClick={() => setFiltroStatus('')} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" /> Limpar filtro de status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSomentePendentes(v => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${somentePendentes ? 'bg-amber-100 text-amber-700 border-amber-300' : 'text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'}`}
                >
                  <HelpCircle className="h-3 w-3" /> Só pendências
                </button>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto whitespace-nowrap">
                  {selecionados.size} de {linhas.filter(importavel).length} selecionado(s)
                </span>
              </div>

              {pendentes > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>{pendentes}</strong> das linhas selecionadas ainda não têm um cargo escolhido — elas serão <strong>ignoradas</strong> nesta importação.
                    Clique em <strong>"Só pendências"</strong> pra resolver, ou desmarque-as.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 w-8">
                        <button type="button" onClick={toggleSelecionarTodasFiltradas} className="flex items-center text-slate-400 hover:text-blue-600" title="Selecionar/desmarcar todos os filtrados">
                          {todasFiltradasSelecionadas ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5" />}
                        </button>
                      </th>
                      <th className="p-2 whitespace-nowrap">Empresa</th>
                      <th className="p-2 whitespace-nowrap">Código</th>
                      <th className="p-2 whitespace-nowrap">Funcionário (planilha)</th>
                      <th className="p-2 whitespace-nowrap">Cargo (planilha)</th>
                      <th className="p-2 whitespace-nowrap">Status</th>
                      <th className="p-2 whitespace-nowrap">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center text-xs text-slate-400">Nenhuma linha encontrada para o filtro aplicado.</td></tr>
                    ) : linhasFiltradas.map(l => {
                      const info = STATUS_INFO[l.status]
                      const sel = selecionados.has(l.key)
                      return (
                        <tr key={l.key} className={`hover:bg-slate-50/60 align-top ${!importavel(l) ? 'opacity-50' : ''}`}>
                          <td className="p-2">
                            {importavel(l) && (
                              <button type="button" onClick={() => toggleSelecionado(l.key)} className="flex items-center">
                                {sel ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5 text-slate-300" />}
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-slate-700 whitespace-nowrap">{l.empresaNome || <span className="text-red-500 font-mono">{l.cnpj}</span>}</td>
                          <td className="p-2 text-[11px] font-mono text-slate-500">{l.codigo}</td>
                          <td className="p-2 text-[11px] font-semibold text-slate-800">
                            {l.nome}
                            {l.status === 'atualizar' && l.diffs?.length > 0 && (
                              <div className="text-[10px] font-normal text-amber-600 mt-0.5">
                                muda: {l.diffs.map(d => DIFF_LABEL[d]).join(', ')}
                                {l.diffs.includes('cargo') && ` (${l.cargoAtualNome || '—'} → ${l.cargoNome || '—'})`}
                                {l.diffs.includes('situacao') && ` · situação: ${situacaoLabel(l.situacaoAtual)} → ${situacaoLabel(l.situacao)}`}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap">
                            {l.cargoNomePlanilha
                              ? <>{l.codigoCargo && <span className="font-mono text-slate-400 mr-1">{l.codigoCargo} —</span>}{l.cargoNomePlanilha}</>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${info.cls}`}>
                              <info.icon className="h-3 w-3" /> {info.label}
                            </span>
                          </td>
                          <td className="p-2 min-w-[220px]">
                            {l.status === 'cargo_nao_encontrado' && (
                              <select
                                value={l.cargoEscolhido}
                                onChange={e => atualizarLinha(l.key, 'cargoEscolhido', e.target.value)}
                                className={`w-full text-[11px] p-1.5 border rounded-md bg-white font-medium text-slate-800 ${!l.cargoEscolhido ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                              >
                                <option value="">Selecione o cargo (código {l.codigoCargo})...</option>
                                {cargos.filter(c => c.empresa_id === l.empresaId).map(c => (
                                  <option key={c.id} value={c.id}>{c.codigo_cargo ? `${c.codigo_cargo} — ` : ''}{c.nome_cargo}</option>
                                ))}
                              </select>
                            )}
                            {l.status === 'novo' && (
                              <span className="text-[11px] text-slate-400">Cria novo cadastro — cargo: {l.cargoNome}</span>
                            )}
                            {l.status === 'atualizar' && (
                              <span className="text-[11px] text-slate-400">Atualiza os campos alterados</span>
                            )}
                            {l.status === 'ok' && (
                              <span className="text-[11px] text-emerald-500">Nenhuma ação necessária</span>
                            )}
                            {l.status === 'empresa_nao_encontrada' && (
                              <span className="text-[11px] text-red-500">CNPJ não cadastrado em Empresas — não será importado</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* AUSENTES NA PLANILHA */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <UserX className="h-4 w-4 text-red-500" />
                  <h3 className="text-xs font-bold text-slate-800">Ausentes na planilha ({ausentes.length})</h3>
                  <span className="text-[11px] text-slate-400">— ativos no sistema, não encontrados no arquivo importado</span>
                </div>
                {ausentes.length === 0 ? (
                  <p className="text-xs text-slate-400 border border-slate-200 rounded-lg p-3">Nenhum funcionário ativo ficou de fora da planilha.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-red-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-red-50 border-b border-red-200 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                          <th className="p-2 w-8">
                            <button type="button" onClick={toggleSelecionarTodasAusentes} className="flex items-center text-red-400 hover:text-red-600" title="Selecionar/desmarcar todos">
                              {todasAusentesSelecionadas ? <CheckSquare className="h-3.5 w-3.5 text-red-600" /> : <Square className="h-3.5 w-3.5" />}
                            </button>
                          </th>
                          <th className="p-2 whitespace-nowrap">Código</th>
                          <th className="p-2 whitespace-nowrap">Funcionário</th>
                          <th className="p-2 whitespace-nowrap">Empresa</th>
                          <th className="p-2 whitespace-nowrap">Cargo</th>
                          <th className="p-2 whitespace-nowrap">Data de Demissão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {ausentes.map(a => {
                          const sel = selecionadosAusentes.has(a.key)
                          return (
                            <tr key={a.key} className="hover:bg-red-50/40">
                              <td className="p-2">
                                <button type="button" onClick={() => toggleSelecionadoAusente(a.key)} className="flex items-center">
                                  {sel ? <CheckSquare className="h-3.5 w-3.5 text-red-600" /> : <Square className="h-3.5 w-3.5 text-slate-300" />}
                                </button>
                              </td>
                              <td className="p-2 text-[11px] font-mono text-slate-500">{a.codigo || '—'}</td>
                              <td className="p-2 text-[11px] font-semibold text-slate-800">{a.nome}</td>
                              <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap">{a.empresaNome || '—'}</td>
                              <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap">{a.cargoNome || '—'}</td>
                              <td className="p-2">
                                <input
                                  type="date"
                                  value={a.dataDemissao}
                                  onChange={e => atualizarAusente(a.key, 'dataDemissao', e.target.value)}
                                  className="text-[11px] p-1.5 border border-slate-200 rounded-md bg-white font-medium text-slate-800"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ETAPA: preview (Demissões) ── */}
          {etapa === 'preview' && modo === 'demissoes' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700"><strong>{nomeArquivo}</strong> — {linhasDem.length} combinação(ões) de empresa + código encontradas</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_INFO_DEM).map(([key, info]) => contagensDem[key] ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroStatusDem(prev => prev === key ? '' : key)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-shadow ${info.cls} ${filtroStatusDem === key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                  >
                    <info.icon className="h-3 w-3" /> {contagensDem[key]} {info.label.toLowerCase()}
                  </button>
                ) : null)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroTextoDem}
                    onChange={e => setFiltroTextoDem(e.target.value)}
                    placeholder="Filtrar por empresa, código ou nome..."
                    className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {filtroStatusDem && (
                  <button onClick={() => setFiltroStatusDem('')} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" /> Limpar filtro de status
                  </button>
                )}
                <span className="text-[11px] font-semibold text-slate-400 ml-auto whitespace-nowrap">
                  {selecionadosDem.size} de {linhasDem.filter(importavelDem).length} selecionado(s)
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 w-8">
                        <button type="button" onClick={toggleSelecionarTodasFiltradasDem} className="flex items-center text-slate-400 hover:text-blue-600" title="Selecionar/desmarcar todos os filtrados">
                          {todasFiltradasSelecionadasDem ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5" />}
                        </button>
                      </th>
                      <th className="p-2 whitespace-nowrap">Empresa</th>
                      <th className="p-2 whitespace-nowrap">Código</th>
                      <th className="p-2 whitespace-nowrap">Funcionário</th>
                      <th className="p-2 whitespace-nowrap">Data de Demissão (planilha)</th>
                      <th className="p-2 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasDemFiltradas.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-xs text-slate-400">Nenhuma linha encontrada para o filtro aplicado.</td></tr>
                    ) : linhasDemFiltradas.map(l => {
                      const info = STATUS_INFO_DEM[l.status]
                      const sel = selecionadosDem.has(l.key)
                      return (
                        <tr key={l.key} className={`hover:bg-slate-50/60 align-top ${!importavelDem(l) ? 'opacity-50' : ''}`}>
                          <td className="p-2">
                            {importavelDem(l) && (
                              <button type="button" onClick={() => toggleSelecionadoDem(l.key)} className="flex items-center">
                                {sel ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5 text-slate-300" />}
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-slate-700 whitespace-nowrap">{l.empresaNome || <span className="text-red-500 font-mono">{l.cnpj}</span>}</td>
                          <td className="p-2 text-[11px] font-mono text-slate-500">{l.codigo}</td>
                          <td className="p-2 text-[11px] font-semibold text-slate-800">
                            {l.nomeAtual || l.nome}
                            {l.status === 'demitir' && l.dataDemissaoAtual && (
                              <div className="text-[10px] font-normal text-amber-600 mt-0.5">
                                situação atual: {situacaoLabel(l.situacaoAtual)} · demissão atual: {l.dataDemissaoAtual}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-slate-600 whitespace-nowrap font-mono">{l.dataDemissao || '—'}</td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${info.cls}`}>
                              <info.icon className="h-3 w-3" /> {info.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ETAPA: importando ── */}
          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">{modo === 'demissoes' ? 'Atualizando demissões...' : 'Importando funcionários...'}</p>
              <p className="text-xs text-slate-400">Não feche esta janela.</p>
            </div>
          )}

          {/* ── ETAPA: resultado ── */}
          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border flex items-start gap-3 ${resultado.erros.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                {resultado.erros.length === 0
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {resultado.erros.length === 0 ? 'Importação concluída com sucesso!' : 'Importação concluída com avisos'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>{resultado.atualizados}</strong> atualizado(s) ·{' '}
                    <strong>{resultado.criados}</strong> criado(s) ·{' '}
                    <strong>{resultado.demitidos}</strong> marcado(s) como demitido(s)
                    {resultado.pendentesIgnorados > 0 && <> · <strong>{resultado.pendentesIgnorados}</strong> pendente(s) sem cargo (não importados)</>}
                  </p>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">{resultado.erros.length} erro(s)</p>
                  {resultado.erros.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {etapa === 'selecao' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          )}
          {etapa === 'preview' && modo === 'cadastro' && (
            <>
              <button onClick={() => { setEtapa('selecao'); setLinhas([]); setAusentes([]); setSelecionados(new Set()); setSelecionadosAusentes(new Set()) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              {pendentes > 0 && (
                <span className="text-[11px] text-amber-600 font-semibold">{pendentes} pendência(s) — serão ignoradas</span>
              )}
              {(prontasParaImportar === 0 && ausentesSelecionados.length === 0) && (
                <span className="text-[11px] text-slate-400 font-semibold">Selecione ao menos um item pra importar</span>
              )}
              <button
                onClick={handleImportar}
                disabled={prontasParaImportar === 0 && ausentesSelecionados.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${(prontasParaImportar === 0 && ausentesSelecionados.length === 0) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                Importar {(prontasParaImportar + ausentesSelecionados.length) > 0 ? `(${prontasParaImportar + ausentesSelecionados.length})` : ''} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {etapa === 'preview' && modo === 'demissoes' && (
            <>
              <button onClick={() => { setEtapa('selecao'); setLinhasDem([]); setSelecionadosDem(new Set()) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              {linhasDemSelecionadas.length === 0 && (
                <span className="text-[11px] text-slate-400 font-semibold">Selecione ao menos um item pra atualizar</span>
              )}
              <button
                onClick={handleImportarDemissoes}
                disabled={linhasDemSelecionadas.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${linhasDemSelecionadas.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                Atualizar {linhasDemSelecionadas.length > 0 ? `(${linhasDemSelecionadas.length})` : ''} <ChevronRight className="h-3.5 w-3.5" />
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
