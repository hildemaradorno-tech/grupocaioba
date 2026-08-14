import React, { createContext, useContext, useState } from 'react'

// Backing store module-level: sobrevive navegações de rota, perde em F5
const STATUS_PADRAO = ['mapeado', 'programado', 'em_andamento', 'pausado']

// Flag de primeiro acesso ao módulo de projetos nesta sessão.
// Ancorado em window para sobreviver ao HMR do Vite em dev; reseta em F5/reload.
if (!window._projetosSession) window._projetosSession = { primeiroAcesso: true }
export const _projetosSession = window._projetosSession

const _f = {
  filtroEmpresa: '', filtroDepartamento: '', filtroArea: '',
  filtroFase: '', filtroSistema: '',
  filtroRespProjeto: '', filtroRespTarefa: '',
  filtrosAbertos: false,
  filtroStatusProjeto: [...STATUS_PADRAO],
  filtroStatusTarefa:  [...STATUS_PADRAO],
  filtroDataIni: '',
  filtroDataFim: '',
  filtroDataTipo: 'fim',
  filtroDataProjIni: '',
  filtroDataProjFim: '',
  modoVerTodos: false,
}

const ProjetosFiltrosContext = createContext(null)

export function ProjetosFiltrosProvider({ children }) {
  const [filtroEmpresa,      setFiltroEmpresa]      = useState(() => _f.filtroEmpresa)
  const [filtroDepartamento, setFiltroDepartamento] = useState(() => _f.filtroDepartamento)
  const [filtroArea,         setFiltroArea]         = useState(() => _f.filtroArea)
  const [filtroFase,         setFiltroFase]         = useState(() => _f.filtroFase)
  const [filtroSistema,      setFiltroSistema]      = useState(() => _f.filtroSistema)
  const [filtroRespProjeto,  setFiltroRespProjeto]  = useState(() => _f.filtroRespProjeto)
  const [filtroRespTarefa,     setFiltroRespTarefa]     = useState(() => _f.filtroRespTarefa)
  const [filtrosAbertos,       setFiltrosAbertos]       = useState(() => _f.filtrosAbertos)
  const [filtroStatusProjeto,  setFiltroStatusProjeto]  = useState(() => _f.filtroStatusProjeto)
  const [filtroStatusTarefa,   setFiltroStatusTarefa]   = useState(() => _f.filtroStatusTarefa)
  const [filtroDataIni,        setFiltroDataIni]        = useState(() => _f.filtroDataIni)
  const [filtroDataFim,        setFiltroDataFim]        = useState(() => _f.filtroDataFim)
  const [filtroDataTipo,       setFiltroDataTipo]       = useState(() => _f.filtroDataTipo)
  const [filtroDataProjIni,    setFiltroDataProjIniState] = useState(() => _f.filtroDataProjIni)
  const [filtroDataProjFim,    setFiltroDataProjFimState] = useState(() => _f.filtroDataProjFim)
  const [modoVerTodos,         setModoVerTodosState]      = useState(() => _f.modoVerTodos)

  const mk = (setter, key) => (v) => { setter(v); _f[key] = v }

  const limparFiltros = () => {
    const keys = ['filtroEmpresa','filtroDepartamento','filtroArea','filtroFase','filtroSistema','filtroRespProjeto','filtroRespTarefa']
    keys.forEach(k => { _f[k] = '' })
    setFiltroEmpresa(''); setFiltroDepartamento(''); setFiltroArea('')
    setFiltroFase(''); setFiltroSistema(''); setFiltroRespProjeto(''); setFiltroRespTarefa('')
    _f.filtroStatusProjeto = [...STATUS_PADRAO]; setFiltroStatusProjeto([...STATUS_PADRAO])
    _f.filtroStatusTarefa  = [...STATUS_PADRAO]; setFiltroStatusTarefa([...STATUS_PADRAO])
    _f.filtroDataIni = ''; setFiltroDataIni('')
    _f.filtroDataFim = ''; setFiltroDataFim('')
    _f.filtroDataTipo = 'fim'; setFiltroDataTipo('fim')
    _f.filtroDataProjIni = ''; setFiltroDataProjIniState('')
    _f.filtroDataProjFim = ''; setFiltroDataProjFimState('')
  }

  const temFiltroAtivo = !!(filtroEmpresa || filtroDepartamento || filtroArea || filtroFase || filtroSistema || filtroRespProjeto || filtroRespTarefa)

  return (
    <ProjetosFiltrosContext.Provider value={{
      filtroEmpresa,      setFiltroEmpresa:      mk(setFiltroEmpresa,      'filtroEmpresa'),
      filtroDepartamento, setFiltroDepartamento: mk(setFiltroDepartamento, 'filtroDepartamento'),
      filtroArea,         setFiltroArea:         mk(setFiltroArea,         'filtroArea'),
      filtroFase,         setFiltroFase:         mk(setFiltroFase,         'filtroFase'),
      filtroSistema,      setFiltroSistema:      mk(setFiltroSistema,      'filtroSistema'),
      filtroRespProjeto,  setFiltroRespProjeto:  mk(setFiltroRespProjeto,  'filtroRespProjeto'),
      filtroRespTarefa,   setFiltroRespTarefa:   mk(setFiltroRespTarefa,   'filtroRespTarefa'),
      filtrosAbertos,     setFiltrosAbertos:     mk(setFiltrosAbertos,     'filtrosAbertos'),
      filtroStatusProjeto,
      setFiltroStatusProjeto: (v) => { setFiltroStatusProjeto(v); _f.filtroStatusProjeto = v },
      filtroStatusTarefa,
      setFiltroStatusTarefa:  (v) => { setFiltroStatusTarefa(v);  _f.filtroStatusTarefa  = v },
      filtroDataIni,
      setFiltroDataIni: (v) => { setFiltroDataIni(v); _f.filtroDataIni = v },
      filtroDataFim,
      setFiltroDataFim: (v) => { setFiltroDataFim(v); _f.filtroDataFim = v },
      filtroDataTipo,
      setFiltroDataTipo: (v) => { setFiltroDataTipo(v); _f.filtroDataTipo = v },
      filtroDataProjIni,
      setFiltroDataProjIni: (v) => { setFiltroDataProjIniState(v); _f.filtroDataProjIni = v },
      filtroDataProjFim,
      setFiltroDataProjFim: (v) => { setFiltroDataProjFimState(v); _f.filtroDataProjFim = v },
      modoVerTodos,
      setModoVerTodos: (v) => { setModoVerTodosState(v); _f.modoVerTodos = v },
      limparFiltros,
      temFiltroAtivo,
    }}>
      {children}
    </ProjetosFiltrosContext.Provider>
  )
}

export const useProjetosFiltros = () => useContext(ProjetosFiltrosContext)

// Utilitário: aplica os filtros globais sobre um array de projetos.
// deptos: Set de departamento_nome permitidos (vazio = sem restrição de acesso)
export function aplicarFiltrosGlobais(projetos, ctx, deptos) {
  const { filtroEmpresa, filtroDepartamento, filtroArea, filtroFase, filtroSistema, filtroRespProjeto, filtroRespTarefa } = ctx
  return projetos.filter(p => {
    if (deptos?.size > 0 && p.departamento_nome && !deptos.has(p.departamento_nome)) return false
    if (filtroEmpresa      && (p.empresa_nome       || '') !== filtroEmpresa)      return false
    if (filtroDepartamento && (p.departamento_nome  || '') !== filtroDepartamento) return false
    if (filtroArea         && (p.area_nome          || '') !== filtroArea)         return false
    if (filtroRespProjeto  && (p.responsavel_nome   || '') !== filtroRespProjeto)  return false
    const tfs = p.proj_tarefas || []
    if (filtroFase     && !tfs.some(t => t.fase_nome     === filtroFase))     return false
    if (filtroSistema  && !tfs.some(t => t.sistema_nome  === filtroSistema))  return false
    if (filtroRespTarefa && !tfs.some(t => t.responsavel_nome === filtroRespTarefa)) return false
    return true
  })
}
