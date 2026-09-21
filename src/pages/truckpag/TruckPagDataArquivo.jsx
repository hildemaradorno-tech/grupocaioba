import React from 'react'
import { lerDataArquivoTruckPag } from './truckpagUtils'

// Data de modificação (no SharePoint) do arquivo que alimenta a aba, guardada na última vez que
// "Atualizar do SharePoint" rodou neste navegador. Lê a cada render — a tela re-renderiza ao fim
// da sincronização.
export default function TruckPagDataArquivo({ chave, rotulo = 'Arquivo modificado em' }) {
  const iso = lerDataArquivoTruckPag(chave)
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return (
    <span className="text-[10px] text-slate-400 whitespace-nowrap">
      {rotulo}: <strong className="text-slate-500">{d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
    </span>
  )
}
