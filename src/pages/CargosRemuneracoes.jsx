import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, X, AlertTriangle, Loader2, Edit2, Trash2, FileDown, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-auto min-w-[180px]'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtPct = (v) => (v != null && v !== '') ? `${parseFloat(v).toFixed(2)}%` : '-'
const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Linha fixa de DSR — todo cargo listado ganha essa linha automaticamente, sem valor calculado.
const LINHA_DSR = { tipo: 'dsr', id: 'dsr', descricao: 'DSR (Conforme o mês corrente)', display: '-' }

// Mostra só os campos que a Política realmente tem preenchidos — sem adivinhar pelo Nome da
// Base. R$ Valor (fixo) tem prioridade e aparece sozinho, porque no motor de cálculo ele
// substitui os percentuais em vez de somar com eles; senão, mostra cada percentual preenchido
// (uma política pode ter % Serviços E % Peças ao mesmo tempo).
const valoresDaPolitica = (p) => {
  if (p.comissao_valor != null) return [{ rotulo: 'R$ Valor', display: fmtBRL(p.comissao_valor) }]
  const partes = []
  if (p.comissao_servicos != null) partes.push({ rotulo: '% Serviços', display: fmtPct(p.comissao_servicos) })
  if (p.comissao_pecas != null) partes.push({ rotulo: '% Peças', display: fmtPct(p.comissao_pecas) })
  if (p.comissao_total != null) partes.push({ rotulo: '% Total', display: fmtPct(p.comissao_total) })
  return partes.length > 0 ? partes : [{ rotulo: '-', display: '-' }]
}

const FORM_GANHO_VAZIO = { cargo_id: '', descricao: '', metrica: '', tipo_valor: 'VALOR_FIXO', valor: '' }

export default function CargosRemuneracoes() {
  const { hasPermission } = useAuth()
  const canEditPolitica = hasPermission('politica-comissao', 'editar')
  const navigate = useNavigate()

  // Leva pra Política de Comissões já com a edição dessa política aberta — usado tanto ao
  // clicar no cargo (edita a primeira política dele) quanto ao clicar numa linha específica.
  const abrirEdicaoPolitica = (politicaId) => {
    if (!politicaId) return
    navigate('/politica-comissao', { state: { editarPoliticaId: politicaId } })
  }
  const canEdit = hasPermission('cargos-remuneracoes', 'editar')

  const [cargos, setCargos] = useState([])
  const [politicas, setPoliticas] = useState([])
  const [ganhos, setGanhos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)

  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroAgrupamentoEmpresa, setFiltroAgrupamentoEmpresa] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroAgrupamentoCargo, setFiltroAgrupamentoCargo] = useState('')
  const [filtroDepartamento, setFiltroDepartamento] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const [modalGanhoAberto, setModalGanhoAberto] = useState(false)
  const [editandoGanhoId, setEditandoGanhoId] = useState(null)
  const [formGanho, setFormGanho] = useState(FORM_GANHO_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [salvandoGanho, setSalvandoGanho] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErro(null)
    try {
      const [cargosData, politicasData, ganhosData, deptos, sets] = await Promise.all([
        apiService.getCargos(),
        apiService.getPoliticaComissao(),
        apiService.getCargoGanhos(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
      ])
      setCargos(cargosData)
      setPoliticas(politicasData.filter(p => p.ativo !== false))
      setGanhos(ganhosData.filter(g => g.ativo !== false))
      setDepartamentos(deptos)
      setSetores(sets)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const departamentosMap = useMemo(() => Object.fromEntries(departamentos.map(d => [d.id, d])), [departamentos])
  const setoresMap = useMemo(() => Object.fromEntries(setores.map(s => [s.id, s])), [setores])

  // Entram cargos que já têm ao menos uma Política de Comissão ativa OU um Ganho manual
  // cadastrado — cargo sem nenhum dos dois ainda não tem o que mostrar, então não aparece.
  const cargosComPolitica = useMemo(() => {
    const cargoIdsComPolitica = new Set(politicas.map(p => p.cargo_id))
    const cargoIdsComGanho = new Set(ganhos.map(g => g.cargo_id))
    return cargos
      .filter(c => cargoIdsComPolitica.has(c.id) || cargoIdsComGanho.has(c.id))
      .map(c => ({
        ...c,
        nomeDepartamentos: (c.departamento_ids || []).map(id => departamentosMap[id]?.nome_departamento).filter(Boolean),
        nomeSetores: (c.setor_ids || []).map(id => setoresMap[id]?.nome_setor).filter(Boolean),
        nomeAreas: [...new Set((c.departamento_ids || []).map(id => departamentosMap[id]?.area).filter(Boolean))],
      }))
  }, [cargos, politicas, ganhos, departamentosMap, setoresMap])

  // Filtros dinâmicos (facetados): as opções de cada seletor são calculadas aplicando todos os
  // OUTROS filtros ativos, menos o dele mesmo — mesmo padrão do Cálculo de Comissões. Selecionar
  // Área "Pós-Vendas", por exemplo, faz Departamento/Setor/Cargo mostrarem só quem é Pós-Vendas.
  const filtrarCargos = useMemo(() => (ignorar) => cargosComPolitica.filter(c => {
    if (ignorar !== 'cargo' && filtroCargo && c.nome_cargo !== filtroCargo) return false
    if (ignorar !== 'empresa' && filtroEmpresa && c.nome_empresa !== filtroEmpresa) return false
    if (ignorar !== 'agrupEmpresa' && filtroAgrupamentoEmpresa && c.nome_agrupamento_empresa !== filtroAgrupamentoEmpresa) return false
    if (ignorar !== 'area' && filtroArea && !c.nomeAreas.includes(filtroArea)) return false
    if (ignorar !== 'agrupCargo' && filtroAgrupamentoCargo && c.nome_agrupamento_cargo !== filtroAgrupamentoCargo) return false
    if (ignorar !== 'departamento' && filtroDepartamento && !c.nomeDepartamentos.includes(filtroDepartamento)) return false
    if (ignorar !== 'setor' && filtroSetor && !c.nomeSetores.includes(filtroSetor)) return false
    return true
  }), [cargosComPolitica, filtroCargo, filtroEmpresa, filtroAgrupamentoEmpresa, filtroArea, filtroAgrupamentoCargo, filtroDepartamento, filtroSetor])

  const empresasUnicas = useMemo(() => juntaUnicos(filtrarCargos('empresa').map(c => c.nome_empresa)), [filtrarCargos])
  const agrupamentosEmpresaUnicos = useMemo(() => juntaUnicos(filtrarCargos('agrupEmpresa').map(c => c.nome_agrupamento_empresa)), [filtrarCargos])
  const areasUnicas = useMemo(() => juntaUnicos(filtrarCargos('area').flatMap(c => c.nomeAreas)), [filtrarCargos])
  const departamentosUnicos = useMemo(() => juntaUnicos(filtrarCargos('departamento').flatMap(c => c.nomeDepartamentos)), [filtrarCargos])
  const setoresUnicos = useMemo(() => juntaUnicos(filtrarCargos('setor').flatMap(c => c.nomeSetores)), [filtrarCargos])
  const agrupamentosCargoUnicos = useMemo(() => juntaUnicos(filtrarCargos('agrupCargo').map(c => c.nome_agrupamento_cargo)), [filtrarCargos])
  const cargosUnicos = useMemo(() => juntaUnicos(filtrarCargos('cargo').map(c => c.nome_cargo)), [filtrarCargos])

  const cargosFiltrados = useMemo(() => filtrarCargos(null), [filtrarCargos])

  // Seleção que ficou sem opção depois de mudar outro filtro é limpa automaticamente.
  useEffect(() => {
    if (filtroEmpresa && !empresasUnicas.includes(filtroEmpresa)) setFiltroEmpresa('')
    if (filtroAgrupamentoEmpresa && !agrupamentosEmpresaUnicos.includes(filtroAgrupamentoEmpresa)) setFiltroAgrupamentoEmpresa('')
    if (filtroArea && !areasUnicas.includes(filtroArea)) setFiltroArea('')
    if (filtroDepartamento && !departamentosUnicos.includes(filtroDepartamento)) setFiltroDepartamento('')
    if (filtroSetor && !setoresUnicos.includes(filtroSetor)) setFiltroSetor('')
    if (filtroAgrupamentoCargo && !agrupamentosCargoUnicos.includes(filtroAgrupamentoCargo)) setFiltroAgrupamentoCargo('')
    if (filtroCargo && !cargosUnicos.includes(filtroCargo)) setFiltroCargo('')
  }, [empresasUnicas, agrupamentosEmpresaUnicos, areasUnicas, departamentosUnicos, setoresUnicos, agrupamentosCargoUnicos, cargosUnicos])

  const temFiltroAtivo = !!(filtroEmpresa || filtroAgrupamentoEmpresa || filtroArea || filtroDepartamento || filtroSetor || filtroAgrupamentoCargo || filtroCargo)
  const limparFiltros = () => {
    setFiltroEmpresa(''); setFiltroAgrupamentoEmpresa(''); setFiltroArea(''); setFiltroDepartamento('')
    setFiltroSetor(''); setFiltroAgrupamentoCargo(''); setFiltroCargo('')
  }

  // Monta as linhas de "Descrição das Remunerações" de um cargo: Políticas de Comissão + Ganhos
  // manuais cadastrados + a linha fixa de DSR por último.
  const linhasDoCargo = (cargo) => {
    const linhasPolitica = politicas
      .filter(p => p.cargo_id === cargo.id)
      .map(p => {
        const partes = valoresDaPolitica(p)
        return {
          tipo: 'politica', id: p.id,
          descricao: p.descricao_comissao || p.nivel_calculo || '-',
          metrica: p.base_calculo?.nome || p.fonte_calculo?.nome || '-',
          partes,
          display: partes.map(x => `${x.rotulo} ${x.display}`).join('  ·  '),
        }
      })
    const linhasGanho = ganhos
      .filter(g => g.cargo_id === cargo.id)
      .map(g => ({
        tipo: 'ganho', id: g.id,
        descricao: g.descricao,
        metrica: g.metrica || '-',
        rotulo: g.tipo_valor === 'PERCENTUAL' ? '%' : 'R$',
        display: g.tipo_valor === 'PERCENTUAL' ? fmtPct(g.valor) : fmtBRL(g.valor),
        ganhoOriginal: g,
      }))
    // Tipo de Ganho em ordem alfabética (A a Z) — DSR fica sempre por último, é uma linha fixa
    // informativa, não um ganho cadastrado.
    const linhasOrdenadas = [...linhasPolitica, ...linhasGanho]
      .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
    return [...linhasOrdenadas, LINHA_DSR]
  }

  // Mesmo código de cargo existe 1x por empresa (dim_cargos é por empresa) — junta as linhas de
  // Política/Ganho de todos os cargos "irmãos" (mesmo código) num card único, removendo
  // duplicatas com descrição+valor idênticos.
  const linhasDoGrupoCargo = (cargosDoGrupo) => {
    const vistos = new Set()
    const linhas = []
    for (const cargo of cargosDoGrupo) {
      for (const l of linhasDoCargo(cargo)) {
        if (l.tipo === 'dsr') continue
        const chave = `${l.tipo}|${l.descricao}|${l.display}`
        if (vistos.has(chave)) continue
        vistos.add(chave)
        linhas.push(l)
      }
    }
    linhas.sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
    return [...linhas, LINHA_DSR]
  }

  // Agrupa os cargos exibidos por Departamento, igual ao padrão já usado em Cálculo de Comissões
  // — e dentro de cada departamento, agrupa por código do cargo, pra cargos com o mesmo código
  // em empresas diferentes aparecerem num card só, em vez de um card duplicado por empresa.
  const gruposPorDepartamento = useMemo(() => {
    const grupos = new Map()
    for (const c of cargosFiltrados) {
      const nome = c.nomeDepartamentos.join(', ') || 'Sem Departamento'
      if (!grupos.has(nome)) grupos.set(nome, [])
      grupos.get(nome).push(c)
    }
    return [...grupos.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([nomeDepartamento, cargosDoDepto]) => {
        const porCodigo = new Map()
        for (const c of cargosDoDepto) {
          const chave = c.codigo_cargo ? `cod:${c.codigo_cargo}` : `nome:${c.nome_cargo}`
          if (!porCodigo.has(chave)) porCodigo.set(chave, [])
          porCodigo.get(chave).push(c)
        }
        const itens = [...porCodigo.entries()]
          .map(([chave, cargosDoGrupo]) => ({
            chave,
            codigo_cargo: cargosDoGrupo[0].codigo_cargo,
            nome_cargo: cargosDoGrupo[0].nome_cargo,
            cargos: cargosDoGrupo,
          }))
          .sort((a, b) => (a.codigo_cargo || '').localeCompare(b.codigo_cargo || '', 'pt-BR', { numeric: true }) || a.nome_cargo.localeCompare(b.nome_cargo, 'pt-BR'))
        return { nomeDepartamento, itens }
      })
  }, [cargosFiltrados])

  const abrirIncluirGanho = (cargoId) => {
    setEditandoGanhoId(null)
    setFormGanho({ ...FORM_GANHO_VAZIO, cargo_id: cargoId || '' })
    setErroModal(null)
    setModalGanhoAberto(true)
  }

  const abrirEditarGanho = (g) => {
    setEditandoGanhoId(g.id)
    setFormGanho({
      cargo_id: g.cargo_id, descricao: g.descricao, metrica: g.metrica || '',
      tipo_valor: g.tipo_valor, valor: g.valor ?? '',
    })
    setErroModal(null)
    setModalGanhoAberto(true)
  }

  const handleSalvarGanho = async (e) => {
    e.preventDefault()
    setErroModal(null)
    if (!formGanho.cargo_id) { setErroModal('Selecione o cargo.'); return }
    setSalvandoGanho(true)
    try {
      const cargo = cargos.find(c => c.id === formGanho.cargo_id)
      const payload = {
        cargo_id: formGanho.cargo_id,
        empresa_id: cargo?.empresa_id || null,
        descricao: formGanho.descricao,
        metrica: formGanho.metrica || null,
        tipo_valor: formGanho.tipo_valor,
        valor: formGanho.valor !== '' ? parseFloat(formGanho.valor) : null,
        ordem: editandoGanhoId ? undefined : ganhos.filter(g => g.cargo_id === formGanho.cargo_id).length,
      }
      if (editandoGanhoId) {
        await apiService.updateCargoGanho(editandoGanhoId, payload)
      } else {
        await apiService.createCargoGanho(payload)
      }
      await loadData()
      setModalGanhoAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvandoGanho(false)
    }
  }

  const handleExcluirGanho = async (g) => {
    if (!window.confirm(`Excluir "${g.descricao}"? Essa ação não pode ser desfeita.`)) return
    try {
      await apiService.deleteCargoGanho(g.id)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  // PDF — mesmo padrão (jsPDF + html2canvas) já usado em Cálculo de Comissões: uma página por
  // Departamento, cada cargo vira um bloco com sua tabela de remunerações.
  const handleBaixarPDF = async () => {
    if (gruposPorDepartamento.length === 0) return
    setGerandoPDF(true)
    setErro(null)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const MARGIN = 24
      const WRAP_W = 1400
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN

      // Mesmo visual da tela: cards em grid 2 colunas, cabeçalho cinza-claro, linha de DSR em
      // destaque âmbar — só sem os botões de ação (Ganho/editar/excluir), que não fazem sentido no PDF.
      const montarHtmlDepartamento = (grupo) => {
        const cardsCargo = grupo.itens.map(cargoGrupo => {
          const linhas = linhasDoGrupoCargo(cargoGrupo.cargos)
          const linhasHtml = linhas.map(l => `
            <tr style="${l.tipo === 'dsr' ? 'background:#fffbeb;' : ''}">
              <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${l.descricao}</td>
              <td style="padding:5px 10px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e293b;">${l.display}</td>
            </tr>`).join('')
          return `
            <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;break-inside:avoid;">
              <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:800;color:#0f172a;">
                ${cargoGrupo.codigo_cargo ? `<span style="color:#94a3b8;font-weight:600;">${cargoGrupo.codigo_cargo} — </span>` : ''}${cargoGrupo.nome_cargo}
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                  <tr style="color:#94a3b8;text-transform:uppercase;font-size:9px;">
                    <th style="padding:5px 10px;text-align:left;">Tipo de Ganho</th>
                    <th style="padding:5px 10px;text-align:right;">%/Valor</th>
                  </tr>
                </thead>
                <tbody>${linhasHtml}</tbody>
              </table>
            </div>`
        }).join('')

        return `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px;width:${WRAP_W}px;box-sizing:border-box;">
            <div style="border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
              <div style="font-size:20px;font-weight:800;color:#0f172a;">Cargos &amp; Remunerações</div>
              <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px;">Grupo Caiobá</div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#3730a3;background:#e0e7ff;text-transform:uppercase;letter-spacing:0.03em;padding:8px 12px;border-radius:6px;margin-bottom:12px;">
              ${grupo.nomeDepartamento}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              ${cardsCargo}
            </div>
          </div>`
      }

      let primeira = true
      for (const grupo of gruposPorDepartamento) {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:#fff;z-index:-1;`
        wrap.innerHTML = montarHtmlDepartamento(grupo)
        document.body.appendChild(wrap)
        try {
          const canvas = await html2canvas(wrap, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: WRAP_W })
          if (!primeira) pdf.addPage()
          primeira = false
          const h = (canvas.height / canvas.width) * CW
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, MARGIN, CW, h)
        } finally {
          document.body.removeChild(wrap)
        }
      }

      pdf.save('Cargos_e_Remuneracoes.pdf')
    } catch (err) {
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="p-6 space-y-4 max-w-[1500px]">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Cargos e Remunerações
          </h1>
          <p className="text-xs text-slate-500">Relatório das políticas salariais por cargo — comissões, ganhos cadastrados e DSR.</p>
        </div>
        <div className="flex items-center gap-2">
          {canEditPolitica && (
            <button onClick={() => navigate('/politica-comissao')} className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-md transition-colors">
              <Briefcase className="h-3.5 w-3.5" /> Política de Comissões
            </button>
          )}
          {canEdit && (
            <button onClick={() => abrirIncluirGanho('')} className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-md transition-colors">
              <Plus className="h-3.5 w-3.5" /> Cadastrar Descrição de Ganho
            </button>
          )}
          <button
            onClick={handleBaixarPDF}
            disabled={gerandoPDF || gruposPorDepartamento.length === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Baixar PDF
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* FILTROS AVANÇADOS — retrátil, começa fechado */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltrosAbertos(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className={LBL}>Filtros Avançados</span>
          {temFiltroAtivo && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>}
        </button>
        {filtrosAbertos && (
          <div className="flex flex-wrap items-end gap-3 px-4 pb-4 border-t border-slate-100 pt-3">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Empresa</label>
              <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={SEL}>
                <option value="">Todas as Empresas</option>
                {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Agrupamento de Empresas</label>
              <select value={filtroAgrupamentoEmpresa} onChange={e => setFiltroAgrupamentoEmpresa(e.target.value)} className={SEL}>
                <option value="">Todos os Agrupamentos</option>
                {agrupamentosEmpresaUnicos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Área</label>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={SEL}>
                <option value="">Todas as Áreas</option>
                {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Departamento</label>
              <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className={SEL}>
                <option value="">Todos os Departamentos</option>
                {departamentosUnicos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Setor</label>
              <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className={SEL}>
                <option value="">Todos os Setores</option>
                {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Agrupamento de Cargos</label>
              <select value={filtroAgrupamentoCargo} onChange={e => setFiltroAgrupamentoCargo(e.target.value)} className={SEL}>
                <option value="">Todos os Agrupamentos</option>
                {agrupamentosCargoUnicos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Cargo</label>
              <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className={SEL}>
                <option value="">Todos os Cargos</option>
                {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {temFiltroAtivo && (
              <button onClick={limparFiltros} className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* CARDS POR DEPARTAMENTO / CARGO */}
      {gruposPorDepartamento.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center text-xs text-slate-400">
          Nenhum cargo com Política de Comissão ou Ganho cadastrado pros filtros aplicados.
        </div>
      ) : gruposPorDepartamento.map(grupo => (
        <div key={grupo.nomeDepartamento} className="space-y-3">
          <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wide bg-indigo-100 px-3 py-1.5 rounded-md">{grupo.nomeDepartamento}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grupo.itens.map(cargoGrupo => {
              const linhas = linhasDoGrupoCargo(cargoGrupo.cargos)
              const primeiraPoliticaId = linhas.find(l => l.tipo === 'politica')?.id
              return (
              <div key={cargoGrupo.chave} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3
                    className={`text-sm font-bold text-slate-900 ${canEditPolitica && primeiraPoliticaId ? 'cursor-pointer hover:text-blue-700 hover:underline' : ''}`}
                    onClick={canEditPolitica && primeiraPoliticaId ? () => abrirEdicaoPolitica(primeiraPoliticaId) : undefined}
                    title={canEditPolitica && primeiraPoliticaId ? 'Editar Política de Comissão deste cargo' : undefined}
                  >
                    {cargoGrupo.codigo_cargo && <span className="font-mono text-slate-400 mr-1.5">{cargoGrupo.codigo_cargo} —</span>}
                    {cargoGrupo.nome_cargo}
                  </h3>
                  {canEdit && (
                    <button onClick={() => abrirIncluirGanho(cargoGrupo.cargos[0].id)} title="Cadastrar Descrição de Ganho pra este cargo"
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      <Plus className="h-3 w-3" /> Ganho
                    </button>
                  )}
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-[10px] font-semibold uppercase tracking-wide">
                      <th className="px-3 py-1.5">Tipo de Ganho</th>
                      <th className="px-3 py-1.5 text-right">%/Valor</th>
                      {canEdit && <th className="px-2 py-1.5 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {linhas.map(l => (
                      <tr
                        key={l.id}
                        className={`${l.tipo === 'dsr' ? 'bg-amber-50/40' : ''} ${l.tipo === 'politica' && canEditPolitica ? 'cursor-pointer hover:bg-blue-50/60' : ''}`}
                        onClick={l.tipo === 'politica' && canEditPolitica ? () => abrirEdicaoPolitica(l.id) : undefined}
                        title={l.tipo === 'politica' && canEditPolitica ? 'Editar esta Política de Comissão' : undefined}
                      >
                        <td className="px-3 py-1.5 font-semibold text-slate-800">{l.descricao}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold">{l.display}</td>
                        {canEdit && (
                          <td className="px-2 py-1.5 text-right">
                            {l.tipo === 'ganho' && (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => abrirEditarGanho(l.ganhoOriginal)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="h-3 w-3" /></button>
                                <button onClick={() => handleExcluirGanho(l.ganhoOriginal)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* MODAL: CADASTRAR/EDITAR GANHO */}
      {modalGanhoAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {editandoGanhoId ? 'Editar Descrição de Ganho' : 'Cadastrar Descrição de Ganho'}
              </h3>
              <button onClick={() => setModalGanhoAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvarGanho}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Cargo *</label>
                  <select required value={formGanho.cargo_id} onChange={e => setFormGanho(prev => ({ ...prev, cargo_id: e.target.value }))} className={`${SEL} w-full`}>
                    <option value="">Selecione o cargo</option>
                    {cargos.map(c => <option key={c.id} value={c.id}>{c.codigo_cargo ? `${c.codigo_cargo} — ` : ''}{c.nome_cargo}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição do Ganho *</label>
                  <input required type="text" value={formGanho.descricao} onChange={e => setFormGanho(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Ex: Salário Fixo, Bonificação, Prêmio" className={INP} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Métrica / Base</label>
                  <input type="text" value={formGanho.metrica} onChange={e => setFormGanho(prev => ({ ...prev, metrica: e.target.value }))} placeholder="Ex: Mensal, Meta de Vendas" className={INP} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tipo</label>
                    <select value={formGanho.tipo_valor} onChange={e => setFormGanho(prev => ({ ...prev, tipo_valor: e.target.value }))} className={`${SEL} w-full`}>
                      <option value="VALOR_FIXO">R$ Valor Fixo</option>
                      <option value="PERCENTUAL">% Percentual</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Valor</label>
                    <input
                      type="number" step="0.01" value={formGanho.valor}
                      onChange={e => setFormGanho(prev => ({ ...prev, valor: e.target.value }))}
                      onBlur={() => setFormGanho(prev => prev.valor !== '' && !Number.isNaN(parseFloat(prev.valor)) ? { ...prev, valor: parseFloat(prev.valor).toFixed(2) } : prev)}
                      placeholder="0,00" className={INP}
                    />
                  </div>
                </div>
                {erroModal && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalGanhoAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoGanho} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
                  {salvandoGanho && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
