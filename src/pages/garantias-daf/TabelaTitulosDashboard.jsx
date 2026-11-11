import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { apiService } from '../../services/api'

// Tabela de títulos do Dashboard de Títulos a Receber — mesmas colunas, situação e ordenação da
// tabela do Controle, só para consulta (sem a coluna Ações). Recebe as linhas já filtradas
// pelos cards e gráficos do Dashboard.

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (s) => { if (!s) return '—'; try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }
const parseNFServico = (v) => {
  const parts = String(v || '').split('/').map(s => s.trim()).filter(Boolean)
  return parts.length >= 2 ? { rps: parts[0], nfse: parts[1] } : { rps: parts[0] || '—', nfse: parts[0] || '—' }
}

const ROTULO_SITUACAO = {
  os_nao_vinculado: 'OS não vinculado',
  faturamento_pendente: 'Faturamento pendente',
  nf_nao_enviado: 'NF não enviado',
  aguardando_pagamento: 'Aguard. Pagto',
}
const COR_SITUACAO = {
  os_nao_vinculado: 'bg-orange-100 text-orange-700',
  faturamento_pendente: 'bg-rose-100 text-rose-700',
  nf_nao_enviado: 'bg-amber-100 text-amber-700',
  aguardando_pagamento: 'bg-blue-100 text-blue-700',
}

const COLUNAS = [
  { col: 'situacao',           label: 'Situação',           cls: 'w-24' },
  { col: 'empresa',            label: 'Empresa',            cls: 'w-44' },
  { col: 'data_envio',         label: 'Data Envio',         cls: 'w-28' },
  { col: 'nro_titulo',         label: 'Nro Título',         cls: 'w-28' },
  { col: 'nro_lancamento',     label: 'Lanç.',              cls: 'w-24' },
  { col: 'data_emissao',       label: 'Emiss.',             cls: 'w-24' },
  { col: 'data_vencimento',    label: 'Vencto.',            cls: 'w-24' },
  { col: 'atraso',             label: 'Atr.',               cls: 'w-16 text-right' },
  { col: 'os_numero',          label: 'O.S',                cls: 'w-24' },
  { col: 'rps',                label: 'RPS',                cls: 'w-28' },
  { col: 'nfse',               label: 'NFSe',               cls: 'w-28' },
  { col: 'nota_fiscal',        label: 'DANFE',              cls: 'w-28' },
  { col: 'codigo_cliente',     label: 'Cód. Cliente',       cls: 'w-32' },
  { col: 'cliente_fornecedor', label: 'Cliente/Fornecedor', cls: 'w-64' },
  { col: 'tipo_titulo',        label: 'Tipo de Título',     cls: 'w-36' },
  { col: 'conta_gerencial',    label: 'Conta Gerencial',    cls: 'w-44' },
  { col: 'agente_cobrador',    label: 'Agente Cobrador',    cls: 'w-48' },
  { col: 'valor',              label: 'Valor',              cls: 'w-28 text-right' },
  { col: 'saldo',              label: 'Saldo',              cls: 'w-28 text-right' },
]

// Clicar em Empresa, Vencimento ou Tipo de Título filtra o Dashboard inteiro (cards, gráficos e tabelas).
export default function TabelaTitulosDashboard({ rows, filtrosEmpresa, filtroEmpresa, onEmpresa, filtroTipo, onTipo, filtroSituacao, onSituacao, situacaoOf }) {
  // Garantias (qualquer status) — para a Situação e a Data de Envio, como no Controle
  const [garantias, setGarantias] = useState([])
  useEffect(() => {
    apiService.getGarantias({ ...(filtrosEmpresa || {}) }).then(setGarantias).catch(() => setGarantias([]))
  }, [filtrosEmpresa])

  const envioMap = useMemo(() => {
    const map = new Map()
    for (const os of garantias) {
      if (!os.numero_os) continue
      const osNum = String(os.numero_os).trim()
      const nfParts = String(os.numero_nf || '').split('/').map(s => s.trim()).filter(Boolean)
      const data = os.data_envio_fabrica || null
      for (const nf of nfParts) map.set(`${osNum}||${nf}`, data)
      if (!map.has(osNum)) map.set(osNum, data)
    }
    return map
  }, [garantias])
  const garantiasOsSet = useMemo(() => new Set(garantias.map(g => String(g.numero_os ?? '').trim()).filter(Boolean)), [garantias])
  const historicoOsSet = useMemo(
    () => new Set(garantias.filter(g => ['E', 'F'].includes(g.status_codigo)).map(g => String(g.numero_os ?? '').trim()).filter(Boolean)),
    [garantias]
  )

  const dataEnvioDe = useCallback((r) => {
    const os = String(r.os_numero || '').trim()
    return envioMap.get(`${os}||${String(r.nota_fiscal || '').trim()}`) ?? envioMap.get(os) ?? null
  }, [envioMap])
  const situacaoDe = useCallback((r) => {
    const os = String(r.os_numero ?? '').trim()
    if (!garantiasOsSet.has(os)) return 'os_nao_vinculado'
    if (!historicoOsSet.has(os)) return 'faturamento_pendente'
    if (!dataEnvioDe(r)) return 'nf_nao_enviado'
    return 'aguardando_pagamento'
  }, [garantiasOsSet, historicoOsSet, dataEnvioDe])

  const hojeISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

  // Ordenação por coluna (clique no título), igual ao Controle
  const [ordem, setOrdem] = useState({ col: null, dir: 'asc' })
  const ordenarPor = (col) => setOrdem(o => (o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))
  const valorParaOrdenar = useCallback((r, col) => {
    switch (col) {
      case 'situacao': return ROTULO_SITUACAO[situacaoDe(r)] || ''
      case 'data_envio': return dataEnvioDe(r) ?? ''
      case 'rps': return parseNFServico(r.nota_fiscal_servico).rps
      case 'nfse': return parseNFServico(r.nota_fiscal_servico).nfse
      default: return r[col]
    }
  }, [situacaoDe, dataEnvioDe])
  const ordenados = useMemo(() => {
    if (!ordem.col) return rows
    const fator = ordem.dir === 'asc' ? 1 : -1
    const vazio = (v) => v === null || v === undefined || v === '' || v === '—'
    return [...rows].sort((a, b) => {
      const va = valorParaOrdenar(a, ordem.col)
      const vb = valorParaOrdenar(b, ordem.col)
      if (vazio(va) && vazio(vb)) return 0
      if (vazio(va)) return 1
      if (vazio(vb)) return -1
      const na = Number(va), nb = Number(vb)
      if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) * fator
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * fator
    })
  }, [rows, ordem, valorParaOrdenar])

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="p-5 pb-3">
        <p className="text-xs font-bold text-slate-900">Títulos a Receber</p>
      </div>
      <div className="overflow-auto custom-scrollbar-light border-t border-slate-200" style={{ maxHeight: '560px' }}>
        <table className="w-full text-left border-collapse" style={{ minWidth: '2500px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              {COLUNAS.map(({ col, label, cls }) => (
                <th key={col} onClick={() => ordenarPor(col)}
                  className={`p-3 ${cls} cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors`}>
                  <span className={`flex items-center gap-1 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
                    {label}
                    <span className={ordem.col === col ? 'text-blue-500' : 'text-slate-300'}>
                      {ordem.col === col ? (ordem.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {rows.length === 0 ? (
              <tr><td colSpan={COLUNAS.length} className="p-10 text-center text-slate-400">Nenhum título para os filtros aplicados.</td></tr>
            ) : ordenados.map((r, i) => {
              const atrasado = !!r.data_vencimento && r.data_vencimento < hojeISO
              const { rps, nfse } = parseNFServico(r.nota_fiscal_servico)
              const dataEnvio = dataEnvioDe(r)
              const sit = situacaoDe(r)
              return (
                <tr key={i} className={`transition-colors hover:bg-slate-50/70 ${atrasado ? 'bg-red-50/30' : ''}`}>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${COR_SITUACAO[sit]}`}>{ROTULO_SITUACAO[sit]}</span>
                  </td>
                  <td onClick={() => onEmpresa?.(r.empresa?.trim() || 'Não informado')} title={`${r.empresa || ''} — clique para filtrar`}
                    className={`p-3 truncate max-w-[160px] cursor-pointer hover:underline ${filtroEmpresa && filtroEmpresa === (r.empresa?.trim() || 'Não informado') ? 'font-bold text-violet-700' : 'text-slate-600'}`}>{r.empresa || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    {dataEnvio ? <span className="font-semibold text-slate-700">{fmtData(dataEnvio)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.nro_titulo || '—'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{r.nro_lancamento || '—'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{fmtData(r.data_emissao)}</td>
                  <td onClick={() => { const s = situacaoOf?.(r); if (s) onSituacao?.(s) }} title="Clique para filtrar pela situação do vencimento (Vencidos / Vence Hoje / A Vencer)"
                    className="p-3 whitespace-nowrap cursor-pointer hover:underline">
                    <span className={`${atrasado ? 'font-semibold text-red-600' : 'text-slate-500'} ${filtroSituacao && situacaoOf?.(r) === filtroSituacao ? 'font-bold' : ''}`}>{fmtData(r.data_vencimento)}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {r.atraso !== null && r.atraso !== undefined
                      ? <span className={`font-semibold ${atrasado ? 'text-red-600' : 'text-slate-500'}`}>{r.atraso}d</span>
                      : '—'}
                  </td>
                  <td className="p-3 font-mono text-slate-600">{r.os_numero || '—'}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{rps}</td>
                  <td className="p-3 font-mono text-slate-600">{nfse}</td>
                  <td className="p-3 text-slate-500">{r.nota_fiscal || '—'}</td>
                  <td className="p-3 text-slate-500">{r.codigo_cliente || '—'}</td>
                  <td className="p-3 truncate max-w-[240px]" title={r.cliente_fornecedor}>{r.cliente_fornecedor || '—'}</td>
                  <td onClick={() => onTipo?.(r.tipo_titulo?.trim() || 'Não informado')} title="Clique para filtrar por este tipo"
                    className={`p-3 cursor-pointer hover:underline ${filtroTipo && filtroTipo === (r.tipo_titulo?.trim() || 'Não informado') ? 'font-bold text-violet-700' : 'text-slate-600'}`}>{r.tipo_titulo || '—'}</td>
                  <td className="p-3 text-slate-500 truncate max-w-[160px]" title={r.conta_gerencial}>{r.conta_gerencial || '—'}</td>
                  <td className="p-3 text-slate-600 truncate max-w-[180px]" title={r.agente_cobrador}>{r.agente_cobrador || '—'}</td>
                  <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">{r.valor > 0 ? fmtMoeda(r.valor) : '—'}</td>
                  <td className="p-3 text-right font-semibold text-blue-700 whitespace-nowrap">{r.saldo > 0 ? fmtMoeda(r.saldo) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
