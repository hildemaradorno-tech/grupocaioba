import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useKpiYear } from '../../context/KpiYearContext'
import { useEmpresasPermitidas } from '../../hooks/useEmpresasPermitidas'
import { fetchPessoasPorEmpresa } from '../../services/kpiService'

// Empresas DAF (Caiobá Trucks) da Matriz de KPIs, na ordem dos quadros.
export const EMPRESAS_DAF = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']
// Nome fantasia da empresa (dim_empresas.empresa_fantasia), ex.: 'CAIOBÁ TRUCKS - DOURADOS'.
export const rotulo = (n) => `CAIOBÁ TRUCKS - ${n}`

// Quadros que só existem em algumas empresas (pelo cadastro de funcionários ativos — confirmado pelo usuário em
// 23/11/2026). Com empresa marcada no seletor, o quadro só aparece se for de pelo menos uma das marcadas. Quadro fora
// da lista = todas as empresas (Gerente Geral e Gerente de Processos respondem pelo grupo; gerentes de loja = a loja).
export const EMPRESAS_DO_QUADRO = {
  // Bloco 3 - Serviços
  'SETOR FUNILARIA/PINTURA': ['CAMPO GRANDE'],
  'SETOR GARANTIA': ['CAMPO GRANDE', 'DOURADOS'],
  'SETOR DE AGENDAMENTO DE SERVIÇOS': ['CAMPO GRANDE'],
  'CONSULTOR DE PLANO DE MANUTENÇÃO': ['CAMPO GRANDE'],
  'CHEFE DE OFICINA': ['CAMPO GRANDE'],
  'MECÂNICO SÊNIOR LÍDER': ['CHAPADÃO DO SUL'],
  // Bloco 3 - Peças
  'GERENTE ATACADO PEÇAS': ['CAMPO GRANDE'],
  'COORDENADOR ATACADO PEÇAS': ['CAMPO GRANDE'],
  'VENDEDOR DE PEÇAS': ['CAMPO GRANDE', 'DOURADOS'],
  'GERENTE DE COMPRAS': ['CAMPO GRANDE'],
  'SUPERVISÃO DE PEÇAS/ENCARREGADO ESTOQUE': ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS'],
  'ESTOQUISTA/AUXILIAR PEÇAS': ['CAMPO GRANDE', 'DOURADOS'],
}
export const quadroNaEmpresa = (titulo, efetivas) => !EMPRESAS_DO_QUADRO[titulo] || EMPRESAS_DO_QUADRO[titulo].some(c => efetivas.includes(c))

// Empresas DAF liberadas no grupo de acesso do usuário e as que valem agora (marcadas; nenhuma = todas as liberadas).
export function useEmpresasDaf() {
  const { empresasDaf } = useKpiYear()
  const { permiteNome } = useEmpresasPermitidas()
  const liberadas = EMPRESAS_DAF.filter(n => permiteNome(`CAIOBÁ TRUCKS - ${n}`))
  const marcadas = empresasDaf.filter(n => liberadas.includes(n))
  const efetivas = marcadas.length ? marcadas : liberadas
  return { liberadas, efetivas, todas: efetivas.length === EMPRESAS_DAF.length }
}

// Seletores de pessoa dos quadros (23/11/2026): com empresa marcada, só as pessoas com movimento nessas empresas
// (BI Possibilidades). grupo: 'consultores' | 'mecanicos' | 'vendedores'. Devolve filtrar(lista) — sem filtro
// em "Todas", fora da Matriz (ativo = false) ou se o mapa não carregou.
const _pessoasPorAno = new Map() // ano → Promise do mapa
const normNome = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
export function usePessoasDaEmpresa(year, grupo, ativo = true) {
  const { efetivas, todas } = useEmpresasDaf()
  const [mapa, setMapa] = useState(null)
  const filtrando = ativo && !todas
  useEffect(() => {
    if (!filtrando) return undefined
    let vivo = true
    if (!_pessoasPorAno.has(year)) _pessoasPorAno.set(year, fetchPessoasPorEmpresa(year).then(r => { if (!r) _pessoasPorAno.delete(year); return r }))
    _pessoasPorAno.get(year).then(r => { if (vivo) setMapa(r?.[grupo] || null) })
    return () => { vivo = false }
  }, [year, grupo, filtrando])
  const filtrar = (lista) => {
    if (!filtrando || !mapa) return lista
    return lista.filter(n => (mapa[normNome(n)] || []).some(c => efetivas.includes(c)))
  }
  return { filtrar, filtrando: filtrando && !!mapa }
}

// Seletor de empresas DAF do cabeçalho da Matriz (23/11/2026): Todas, uma ou várias (caixas de marcar).
export default function EmpresasDafSelector() {
  const { empresasDaf, setEmpresasDaf } = useKpiYear()
  const { liberadas } = useEmpresasDaf()
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const marcadas = empresasDaf.filter(n => liberadas.includes(n))
  const todas = marcadas.length === 0 || marcadas.length === liberadas.length
  const alternar = (n) => {
    const nova = marcadas.includes(n) ? marcadas.filter(x => x !== n) : [...marcadas, n]
    // Todas marcadas uma a uma = "Todas" (lista vazia).
    setEmpresasDaf(nova.length === liberadas.length ? [] : EMPRESAS_DAF.filter(x => nova.includes(x)))
  }
  const texto = todas ? 'Todas' : marcadas.length === 1 ? rotulo(marcadas[0]) : `${marcadas.length} empresas`
  // Lista: nome fantasia inteiro (largura para o mais longo, "CAIOBÁ TRUCKS - CHAPADÃO DO SUL").

  if (liberadas.length <= 1) return null // só uma empresa liberada: nada a escolher

  return (
    <div ref={ref} className="relative flex flex-col items-start gap-0.5">
      <span className="text-[10px] font-bold text-white uppercase">Empresa</span>
      <button type="button" onClick={() => setAberto(a => !a)} aria-haspopup="listbox" aria-expanded={aberto}
        title={todas ? 'Todas as empresas DAF' : marcadas.map(rotulo).join(', ')}
        className="flex items-center gap-1 bg-white text-slate-700 text-xs font-medium rounded-md px-2 py-1 border border-slate-300 hover:bg-slate-50 focus:outline-none focus:border-blue-400 min-w-[7.5rem] max-w-[16rem] justify-between">
        <span className="truncate">{texto}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div role="listbox" aria-multiselectable="true"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <OpcaoEmpresa marcado={todas} onClick={() => setEmpresasDaf([])} negrito>Todas</OpcaoEmpresa>
          <div className="my-1 border-t border-slate-100" />
          {liberadas.map(n => (
            <OpcaoEmpresa key={n} marcado={!todas && marcadas.includes(n)} onClick={() => alternar(n)}>{rotulo(n)}</OpcaoEmpresa>
          ))}
        </div>
      )}
    </div>
  )
}

function OpcaoEmpresa({ marcado, onClick, negrito = false, children }) {
  return (
    <button type="button" role="option" aria-selected={marcado} onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${negrito ? 'font-semibold' : ''} text-slate-700`}>
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${marcado ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
        {marcado && <Check className="h-2.5 w-2.5 text-white" />}
      </span>
      {children}
    </button>
  )
}
