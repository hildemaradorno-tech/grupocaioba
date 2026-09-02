import React, { useState, useEffect, useMemo } from 'react'
import { Wrench, PlayCircle, Loader2, AlertTriangle, Save, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SEM_DEPARTAMENTO = 'Sem departamento'

const fmtBRL = (v) => v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const mesmoMes = (a, b) => a && b && a.slice(0, 7) === b.slice(0, 7)
// Remove acentos além de trim+uppercase — o arquivo de O.S. do SharePoint grava "CAIOBA TRUCKS"
// sem acento, enquanto o cadastro (dim_empresas.empresa_fantasia) usa "CAIOBÁ TRUCKS"; sem isso,
// nenhuma O.S. batia com a empresa selecionada.
const normaliza = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

export default function CalculoPlanoDms() {
  const { user, hasPermission } = useAuth()
  const canEdit = hasPermission('plano-dms-calculo', 'editar')
  const usuarioLabel = user?.email || 'desconhecido'

  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFim, setPeriodoFim] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')

  const [carregandoLista, setCarregandoLista] = useState(true)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  const [calculando, setCalculando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [resultado, setResultado] = useState(null) // { candidatos, pendencias }
  const [expandido, setExpandido] = useState(new Set())

  const periodoValido = periodoInicio && periodoFim && periodoInicio <= periodoFim && mesmoMes(periodoInicio, periodoFim)

  const mudarMes = (delta) => {
    const base = periodoInicio || periodoFim || new Date().toISOString().slice(0, 10)
    const [ano, mes] = base.split('-').map(Number)
    const data = new Date(ano, mes - 1 + delta, 1)
    const anoAlvo = data.getFullYear()
    const mesAlvo = data.getMonth()
    const ultimoDia = new Date(anoAlvo, mesAlvo + 1, 0).getDate()
    const pad = (n) => String(n).padStart(2, '0')
    setPeriodoInicio(`${anoAlvo}-${pad(mesAlvo + 1)}-01`)
    setPeriodoFim(`${anoAlvo}-${pad(mesAlvo + 1)}-${pad(ultimoDia)}`)
  }

  // Mês anterior por padrão, mesmo critério das demais telas de Comissões.
  useEffect(() => {
    const hoje = new Date()
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const ano = anterior.getFullYear()
    const mes = anterior.getMonth()
    const pad = (n) => String(n).padStart(2, '0')
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    setPeriodoInicio(`${ano}-${pad(mes + 1)}-01`)
    setPeriodoFim(`${ano}-${pad(mes + 1)}-${pad(ultimoDia)}`)
  }, [])

  useEffect(() => {
    (async () => {
      setCarregandoLista(true)
      setErro(null)
      try {
        const [funcionarios, empresas, cargos, departamentos, politicas, categorias, valores] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getPoliticaComissao(),
          apiService.getCategoriasPlanoDms(),
          apiService.getPlanoDmsValores(),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, politicas, categorias, valores })
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoLista(false)
      }
    })()
  }, [])

  const empresasUnicas = useMemo(() => {
    if (!dados) return []
    return [...dados.empresas]
      .filter(e => e.agrupamento_nome === 'Caiobá Trucks')
      .sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR'))
  }, [dados])

  useEffect(() => { setResultado(null); setSalvo(false) }, [periodoInicio, periodoFim, filtroEmpresa])

  // Roster de consultores elegíveis (cargo com Política de Comissão Plano DMS ativa) da empresa
  // selecionada — aparece assim que a empresa é escolhida, mesmo antes de Calcular, pra dar
  // visibilidade de quem é esperado na lista (sem isso, um cálculo que zera tudo por engano
  // parece uma tela vazia sem explicação nenhuma).
  const elegiveis = useMemo(() => {
    if (!dados || !filtroEmpresa) return []
    const empresaSel = dados.empresas.find(e => (e.empresa_fantasia || e.nome_empresa) === filtroEmpresa)
    if (!empresaSel) return []
    const funcionariosAtivos = dados.funcionarios.filter(f => !f.data_demissao && (!f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === '9'))
    const cargosMap = Object.fromEntries(dados.cargos.map(c => [c.id, c]))
    const politicasPlanoDms = dados.politicas.filter(p => p.tipo_calculo === 'PLANO_DMS' && p.ativo !== false)
    return funcionariosAtivos
      .filter(f => f.empresa_id === empresaSel.id)
      .map(f => ({ func: f, cargo: cargosMap[f.cargo_id], politica: politicasPlanoDms.find(p => p.cargo_id === f.cargo_id) }))
      .filter(e => e.politica)
      .sort((a, b) => (a.func.nome_funcionario || '').localeCompare(b.func.nome_funcionario || '', 'pt-BR'))
  }, [dados, filtroEmpresa])

  // Junta o roster com os valores calculados (quando já houver resultado) — antes de Calcular,
  // quantidade/valor ficam em branco; depois, cada linha do roster ganha seu total.
  const linhasPrevia = useMemo(() => {
    const porFuncId = new Map((resultado?.candidatos || []).map(c => [c.func.id, c]))
    return elegiveis.map(e => {
      const calc = porFuncId.get(e.func.id)
      return {
        func: e.func,
        cargo: e.cargo,
        detalhes: calc?.detalhes || [],
        quantidadeTotal: calc ? calc.quantidadeTotal : null,
        valorTotal: calc ? calc.valorTotal : null,
      }
    })
  }, [elegiveis, resultado])

  const handleCalcular = async () => {
    if (!dados || !periodoValido || !filtroEmpresa) return
    setCalculando(true)
    setErro(null)
    try {
      const ano = periodoInicio.slice(0, 4)
      const { matched, semPlano, planoInativo } = await apiService.calcularPlanoDms({ ano, periodoInicio, periodoFim })

      const empresaSel = dados.empresas.find(e => (e.empresa_fantasia || e.nome_empresa) === filtroEmpresa)
      const nomeEmpresaNorm = normaliza(empresaSel?.empresa_fantasia || empresaSel?.nome_empresa)

      const funcionariosAtivos = dados.funcionarios.filter(f => !f.data_demissao && (!f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === '9'))
      const cargosMap = Object.fromEntries(dados.cargos.map(c => [c.id, c]))
      const categoriasMap = new Map(dados.categorias.map(c => [normaliza(c.nome), c]))
      const valoresMap = new Map(dados.valores.map(v => [`${v.categoria_id}::${v.tempo_meses}`, v]))
      // Confirmado com o usuário: quem recebe é quem ocupa o CARGO configurado na Política de
      // Comissão Plano DMS — não importa qual nome está no campo Consultor_Nome de cada O.S.
      // (pode ser outra pessoa que só abriu/registrou a O.S. no sistema). Política herda o
      // empresa_id do cargo com que foi criada, então já vem escopada pra esta empresa.
      const politicasPlanoDms = dados.politicas.filter(p => p.tipo_calculo === 'PLANO_DMS' && p.ativo !== false && p.empresa_id === empresaSel?.id)

      const matchedDaEmpresa = matched.filter(m => normaliza(m.empresa_nome) === nomeEmpresaNorm)
      const semPlanoDaEmpresa = semPlano.filter(m => normaliza(m.empresa_nome) === nomeEmpresaNorm)
      const planoInativoDaEmpresa = planoInativo.filter(m => normaliza(m.empresa_nome) === nomeEmpresaNorm)

      const categoriaSemCadastro = []
      const semValorCadastrado = []
      const semCargoConfigurado = []

      // 1. Agrupa TODAS as O.S. da empresa por categoria+prazo, sem olhar quem está no
      // Consultor_Nome — o total é da empresa como um todo, depois atribuído ao cargo.
      const grupos = new Map() // categoria_id::prazo -> { categoria, tempoMeses, quantidade }
      for (const os of matchedDaEmpresa) {
        const categoria = categoriasMap.get(normaliza(os.categoria))
        if (!categoria) { categoriaSemCadastro.push(os); continue }
        const chave = `${categoria.id}::${os.prazo}`
        if (!grupos.has(chave)) grupos.set(chave, { categoria, tempoMeses: os.prazo, quantidade: 0 })
        grupos.get(chave).quantidade += 1
      }

      const detalhes = []
      let quantidadeTotal = 0
      let valorTotal = 0
      for (const g of grupos.values()) {
        const valorCadastro = valoresMap.get(`${g.categoria.id}::${g.tempoMeses}`)
        if (!valorCadastro || valorCadastro.ativo === false) {
          semValorCadastrado.push({ categoria: g.categoria.nome, tempoMeses: g.tempoMeses, quantidade: g.quantidade })
          continue
        }
        const subtotal = g.quantidade * parseFloat(valorCadastro.valor)
        detalhes.push({ categoria: g.categoria.nome, tempoMeses: g.tempoMeses, quantidade: g.quantidade, valorUnitario: parseFloat(valorCadastro.valor), subtotal })
        quantidadeTotal += g.quantidade
        valorTotal += subtotal
      }

      // 2. Resolve o(s) cargo(s) configurado(s) na política pra esta empresa -> funcionário(s)
      // ativo(s). Com exatamente 1 cargo e 1 titular ativo, ele leva o total inteiro; qualquer
      // outra combinação (0 ou 2+ cargos, 0 ou 2+ titulares) vira pendência — evita atribuir
      // valor errado por adivinhação quando a configuração está ambígua.
      const cargoIdsPolitica = [...new Set(politicasPlanoDms.map(p => p.cargo_id).filter(Boolean))]
      const candidatos = []
      if (cargoIdsPolitica.length === 0) {
        if (quantidadeTotal > 0) semCargoConfigurado.push({ motivo: 'sem_politica', valorTotal, quantidadeTotal })
      } else if (cargoIdsPolitica.length > 1) {
        semCargoConfigurado.push({ motivo: 'multiplos_cargos', cargos: cargoIdsPolitica.map(id => cargosMap[id]?.nome_cargo).filter(Boolean), valorTotal, quantidadeTotal })
      } else if (quantidadeTotal > 0 || detalhes.length > 0) {
        const cargoId = cargoIdsPolitica[0]
        const titulares = funcionariosAtivos.filter(f => f.cargo_id === cargoId && f.empresa_id === empresaSel.id)
        if (titulares.length === 0) {
          semCargoConfigurado.push({ motivo: 'sem_funcionario', cargo: cargosMap[cargoId]?.nome_cargo, valorTotal, quantidadeTotal })
        } else if (titulares.length > 1) {
          semCargoConfigurado.push({ motivo: 'mais_de_um_funcionario', cargo: cargosMap[cargoId]?.nome_cargo, funcionarios: titulares.map(f => f.nome_funcionario), valorTotal, quantidadeTotal })
        } else {
          const func = titulares[0]
          const politica = politicasPlanoDms.find(p => p.cargo_id === cargoId)
          candidatos.push({ func, cargo: cargosMap[cargoId], politica, detalhes, quantidadeTotal, valorTotal })
        }
      }

      setResultado({
        candidatos,
        pendencias: {
          semPlano: semPlanoDaEmpresa,
          planoInativo: planoInativoDaEmpresa,
          categoriaSemCadastro,
          semValorCadastrado,
          semCargoConfigurado,
        },
      })
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCalculando(false)
    }
  }

  const handleSalvar = async () => {
    if (!resultado || resultado.candidatos.length === 0 || !filtroEmpresa) return
    setSalvando(true)
    setErro(null)
    try {
      const empresaSel = dados.empresas.find(e => (e.empresa_fantasia || e.nome_empresa) === filtroEmpresa)
      const departamentosMap = Object.fromEntries(dados.departamentos.map(d => [d.id, d]))

      // Agrupa por (empresa, departamento do funcionário) — cada combinação tem seu próprio
      // lote, mesmo padrão já usado em Cálculo de Comissões DAF.
      const porDepartamento = new Map()
      for (const c of resultado.candidatos) {
        const deptId = (c.func.departamento_ids || [])[0] || null
        const deptNome = deptId ? (departamentosMap[deptId]?.nome_departamento || SEM_DEPARTAMENTO) : SEM_DEPARTAMENTO
        const chave = deptId || SEM_DEPARTAMENTO
        if (!porDepartamento.has(chave)) porDepartamento.set(chave, { deptId, deptNome, candidatos: [] })
        porDepartamento.get(chave).candidatos.push(c)
      }

      for (const { deptId, deptNome, candidatos } of porDepartamento.values()) {
        const funcionarioIds = candidatos.map(c => c.func.id)
        // Preserva comissões já salvas desses funcionários no período que NÃO são deste cálculo
        // (ex: comissão % padrão calculada em Cálculo de Comissões DAF) — salvarComissoesCalculadas
        // apaga TODAS as linhas do funcionário no período antes de reinserir, então precisam ir
        // juntas na mesma chamada pra não serem perdidas.
        const existentes = await apiService.getComissoesCalculadas(periodoInicio, periodoFim)
        const idsPoliticaPlanoDms = new Set(candidatos.map(c => c.politica.id))
        const registrosPreservados = existentes
          .filter(s => funcionarioIds.includes(s.funcionario_id) && !idsPoliticaPlanoDms.has(s.politica_id))
          .map(s => ({
            funcionario_id: s.funcionario_id,
            politica_id: s.politica_id,
            fonte_calculo_id: s.fonte_calculo_id,
            base_calculo_id: s.base_calculo_id,
            periodo_inicio: s.periodo_inicio,
            periodo_fim: s.periodo_fim,
            nivel_calculo: s.nivel_calculo,
            valor_base: s.valor_base,
            percentual_aplicado: s.percentual_aplicado,
            valor_comissao: s.valor_comissao,
            total_linhas_fonte: s.total_linhas_fonte,
            total_linhas_filtradas: s.total_linhas_filtradas,
            detalhe_empresas: s.detalhe_empresas,
            lote_id: s.lote_id,
          }))

        const registrosNovos = candidatos.map(c => ({
          funcionario_id: c.func.id,
          politica_id: c.politica.id,
          fonte_calculo_id: null,
          base_calculo_id: null,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          nivel_calculo: c.politica.nivel_calculo,
          valor_base: c.quantidadeTotal,
          percentual_aplicado: null,
          valor_comissao: c.valorTotal,
          total_linhas_fonte: null,
          total_linhas_filtradas: null,
          // Reaproveita a coluna detalhe_empresas (pensada originalmente pra breakdown por
          // empresa) pra guardar o detalhamento por categoria+prazo — HistoricoComissoes.jsx
          // distingue pelo campo "tipo" e mostra num botão de detalhe próprio pra Plano DMS.
          detalhe_empresas: c.detalhes.map(d => ({ tipo: 'plano_dms', categoria: d.categoria, tempoMeses: d.tempoMeses, quantidade: d.quantidade, valorUnitario: d.valorUnitario, subtotal: d.subtotal })),
        }))

        const valorTotalLote = registrosNovos.reduce((acc, r) => acc + r.valor_comissao, 0)
        const lote = await apiService.salvarLoteRascunho({
          periodoInicio, periodoFim, empresaId: empresaSel?.id, empresaNome: filtroEmpresa,
          departamentoId: deptId, departamentoNome: deptNome,
          qtdFuncionarios: registrosNovos.length, valorTotal: valorTotalLote, usuario: usuarioLabel,
        })

        const registros = [...registrosPreservados, ...registrosNovos.map(r => ({ ...r, lote_id: lote.id }))]
        await apiService.salvarComissoesCalculadas(registros, periodoInicio, periodoFim)
      }
      setSalvo(true)
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const toggleExpandido = (funcId) => {
    setExpandido(prev => {
      const novo = new Set(prev)
      novo.has(funcId) ? novo.delete(funcId) : novo.add(funcId)
      return novo
    })
  }

  if (carregandoLista) {
    return <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
  }

  const totalPendencias = resultado
    ? resultado.pendencias.semPlano.length + resultado.pendencias.planoInativo.length
      + resultado.pendencias.categoriaSemCadastro.length + resultado.pendencias.semValorCadastrado.length
      + resultado.pendencias.semCargoConfigurado.length
    : 0

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" /> Comissão Plano DMS
        </h1>
        <p className="text-xs text-slate-500">Cruza as O.S. tipo P04 (plano de manutenção) do período com o Chassi vinculado, calcula quantidade × Valor Plano DMS por consultor.</p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Empresa</label>
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="w-96 text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {empresasUnicas.map(e => (
                <option key={e.id} value={e.empresa_fantasia || e.nome_empresa}>{e.empresa_fantasia || e.nome_empresa}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Data Início</label>
            <input type="date" className="w-40 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Data Fim</label>
            <div className="flex items-center gap-1">
              <input type="date" className="w-40 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
              <button type="button" onClick={() => mudarMes(-1)} title="Mês anterior" className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => mudarMes(1)} title="Próximo mês" className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleCalcular}
              disabled={!periodoValido || !filtroEmpresa || calculando}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Calcular
            </button>
          )}
          {canEdit && resultado && resultado.candidatos.length > 0 && (
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          )}
          {salvo && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Salvo — segue o fluxo normal em Processamento de Comissões.
            </span>
          )}
        </div>
        {!filtroEmpresa && <p className="text-[11px] text-slate-400 mt-2">Selecione uma empresa acima pra liberar o cálculo.</p>}
      </div>

      {filtroEmpresa && (
        <>
          {/* PRÉVIA POR CONSULTOR — mostra o roster (cargo com Política Plano DMS ativa) assim
              que a empresa é escolhida; quantidade/valor ficam em branco até Calcular rodar. */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">Prévia por Consultor</h3>
              <span className="text-[11px] text-slate-400">{linhasPrevia.length} consultor(es)</span>
            </div>
            {linhasPrevia.length === 0 ? (
              <p className="p-4 text-xs text-slate-400">Nenhum funcionário ativo desta empresa tem cargo com Política de Comissão Plano DMS configurada.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Consultor</th>
                    <th className="p-3">Cargo</th>
                    <th className="p-3 text-right">Valor Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {linhasPrevia.map(c => (
                    <React.Fragment key={c.func.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => toggleExpandido(c.func.id)}>
                        <td className="p-3">
                          {c.detalhes.length > 0 && (expandido.has(c.func.id) ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />)}
                        </td>
                        <td className="p-3">{c.func.nome_funcionario}</td>
                        <td className="p-3 text-slate-500">{c.cargo?.nome_cargo || '-'}</td>
                        <td className="p-3 text-right text-emerald-700 font-semibold">{c.valorTotal == null ? <span className="text-slate-300 font-normal">Aguardando cálculo</span> : fmtBRL(c.valorTotal)}</td>
                      </tr>
                      {expandido.has(c.func.id) && c.detalhes.length > 0 && (
                        <tr>
                          <td colSpan={4} className="p-0 bg-slate-50/60">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="text-[10px] font-semibold uppercase text-slate-400">
                                  <th className="pl-12 py-1.5">Categoria</th>
                                  <th className="py-1.5">Prazo</th>
                                  <th className="py-1.5 text-right">Qtd.</th>
                                  <th className="py-1.5 text-right">Valor Unit.</th>
                                  <th className="py-1.5 pr-4 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="text-[11px] text-slate-600">
                                {c.detalhes.map((d, i) => (
                                  <tr key={i}>
                                    <td className="pl-12 py-1">{d.categoria}</td>
                                    <td className="py-1">{d.tempoMeses} meses</td>
                                    <td className="py-1 text-right font-mono">{d.quantidade}</td>
                                    <td className="py-1 text-right font-mono">{fmtBRL(d.valorUnitario)}</td>
                                    <td className="py-1 pr-4 text-right font-mono">{fmtBRL(d.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* PENDÊNCIAS */}
          {resultado && (
          <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Pendências</h3>
              <span className="text-[11px] text-amber-600">{totalPendencias} item(ns)</span>
            </div>
            {totalPendencias === 0 ? (
              <p className="p-4 text-xs text-slate-400">Nenhuma pendência.</p>
            ) : (
              <div className="p-4 space-y-4 text-xs">
                {resultado.pendencias.semPlano.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1.5">O.S. em aberto sem plano encontrado pro chassi ({resultado.pendencias.semPlano.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-md">
                      {resultado.pendencias.semPlano.map((os, i) => (
                        <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0 text-slate-500">
                          O.S. {os.os_numero} — Chassi {os.veiculo_chassi} — Cliente {os.proprietario_veiculo || '-'} — {os.data_criacao?.split('-').reverse().join('/')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resultado.pendencias.planoInativo.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1.5">O.S. com plano encontrado, mas contrato não ativo ({resultado.pendencias.planoInativo.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-md">
                      {resultado.pendencias.planoInativo.map((os, i) => (
                        <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0 text-slate-500">
                          O.S. {os.os_numero} — Chassi {os.veiculo_chassi} — Cliente {os.proprietario_veiculo || '-'} — {os.categoria} / {os.prazo} meses — Status: <span className="font-semibold text-amber-600">{os.status || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resultado.pendencias.categoriaSemCadastro.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1.5">Categoria de plano sem cadastro em Valor Plano DMS ({resultado.pendencias.categoriaSemCadastro.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-md">
                      {resultado.pendencias.categoriaSemCadastro.map((os, i) => (
                        <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0 text-slate-500">
                          O.S. {os.os_numero} — "{os.categoria}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resultado.pendencias.semValorCadastrado.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1.5">Sem valor cadastrado pra categoria + prazo ({resultado.pendencias.semValorCadastrado.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-md">
                      {resultado.pendencias.semValorCadastrado.map((p, i) => (
                        <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0 text-slate-500">
                          {p.categoria} / {p.tempoMeses} meses ({p.quantidade} O.S.)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resultado.pendencias.semCargoConfigurado.length > 0 && (
                  <div>
                    <p className="font-bold text-slate-700 mb-1.5">Não foi possível atribuir o valor calculado a um funcionário ({resultado.pendencias.semCargoConfigurado.length})</p>
                    <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-md">
                      {resultado.pendencias.semCargoConfigurado.map((p, i) => (
                        <div key={i} className="px-2 py-1 border-b border-slate-50 last:border-0 text-slate-500">
                          {p.motivo === 'sem_politica' && `Nenhuma Política de Comissão Plano DMS configurada pra esta empresa — ${fmtBRL(p.valorTotal)} (${p.quantidadeTotal} O.S.) não calculado`}
                          {p.motivo === 'multiplos_cargos' && `Mais de um cargo configurado na Política Plano DMS desta empresa (${p.cargos.join(', ')}) — não dá pra saber como dividir ${fmtBRL(p.valorTotal)} entre eles`}
                          {p.motivo === 'sem_funcionario' && `Nenhum funcionário ativo no cargo "${p.cargo}" — ${fmtBRL(p.valorTotal)} (${p.quantidadeTotal} O.S.) não calculado`}
                          {p.motivo === 'mais_de_um_funcionario' && `Mais de um funcionário ativo no cargo "${p.cargo}" (${p.funcionarios.join(', ')}) — não dá pra saber quem deve receber ${fmtBRL(p.valorTotal)}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  )
}
