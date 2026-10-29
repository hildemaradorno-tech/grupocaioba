import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Settings2, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { btnPri, btnSec, PaginaPecas, Secao, useOpcoes } from './components/ui'
import { gerarSnapshot } from './gestorPecasApi'
import { useSegmento } from './segmento'

// Resumo dos parâmetros vigentes. A edição fica num só lugar: Configurações → Departamentos → Peças
// (PecasConfiguracao.jsx), para não haver duas telas alterando as mesmas regras.
const NOME_BASE = { quantidade: 'Quantidade', qtd_custo_aquisicao: 'Quantidade × Custo Aquisição', qtd_custo_medio: 'Quantidade × Custo Médio', qtd_custo_medio_contabil: 'Quantidade × Custo Médio Contábil', qtd_valor_base_venda: 'Quantidade × Valor Base Venda', meses_com_saida: 'Quantidade de Meses com Saída' }

export default function PecasParametros() {
  const sg = useSegmento()
  const { hasPermission, hasActionOrDefault } = useAuth()
  const podeSnapshot = hasActionOrDefault(sg.perm('parametros'), 'gerar_snapshot')
  const { opcoes } = useOpcoes()
  const [snap, setSnap] = useState(null)
  const [erro, setErro] = useState(null)
  const p = opcoes?.parametros

  const snapshot = async () => {
    setSnap('Gravando...'); setErro(null)
    try { const r = await gerarSnapshot(); setSnap(`Snapshot de ${r.data} gravado (${r.linhas} itens × loja).`) }
    catch (e) { setErro(e.message); setSnap(null) }
  }

  const linhas = p ? [
    ['Classificação Curva de Venda (ABC)', `Base: ${NOME_BASE[p.abc_base] || p.abc_base} — últimos ${p.abc_periodo_meses} meses — A até ${p.abc_corte_a}%, B até ${p.abc_corte_b}%, C restante`],
    ['Curva XYZ', `${p.xyz_base === 'custo_medio' ? 'Custo médio unitário' : 'Custo médio × saldo atual'} — X até ${p.xyz_corte_x}%, Y até ${p.xyz_corte_y}%, Z restante`],
    ['Popularidade', `Alta ≥ ${p.freq_alta_meses} meses com venda (de 12), Média ≥ ${p.freq_media_meses}, Baixa abaixo`],
    ['Regularidade', `Estável CV ≤ ${p.reg_cv_estavel}, Variável ≤ ${p.reg_cv_variavel}, Irregular acima`],
    ['Mobilidade / Curva D', `Rápido até ${p.mob_rapido_meses} meses, Lento até ${p.mob_lento_meses}, Parado acima, Obsoleto (D) a partir de ${p.obsoleto_meses} meses sem saída`],
    ['Política de compra', p.metodo_compra === 'estatistico' ? `Estatística — ciclo de ${p.ciclo_revisao_dias} dias` : `Dias por célula: ${Object.entries(p.dias_estoque || {}).map(([c, d]) => `${c.replace('_POP', '+')} ${d}`).join(' · ')} (C+ = Venda C com Popularidade ${(p.c_popular_freq || []).map(f => ({ F: 'Alta', M: 'Média', R: 'Baixa' }[f])).join('/') || '—'}) — tempo de reposição padrão ${p.tempo_reposicao_dias} dias`],
    ['Nível de serviço', `A ${Math.round(p.nivel_servico.A * 100)}% · B ${Math.round(p.nivel_servico.B * 100)}% · C ${Math.round(p.nivel_servico.C * 100)}%`],
    ['Excesso / preço', `Cobertura alvo ${p.cobertura_alvo_dias} dias · margem mínima ${Math.round(p.margem_minima * 100)}% · alerta de custo ${Math.round(p.variacao_custo_alerta * 100)}%`],
    ['Lead time por fornecedor', Object.keys(p.lead_time_fornecedor || {}).length ? Object.entries(p.lead_time_fornecedor).map(([f, d]) => `${f}: ${d} d`).join(' · ') : 'Cadastro de cada item'],
  ] : []

  return (
    <PaginaPecas icone={SlidersHorizontal} titulo="Parâmetros do Gestor de Peças" tela="parametros" fonte={opcoes?.fonte} erro={erro}
      acoes={hasPermission(sg.perm('configuracao')) && <Link to={sg.rota('configuracao')} className={btnPri}><Settings2 className="h-3.5 w-3.5" /> Editar em Configurações</Link>}>
      <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-5xl">
        <Secao titulo="Regras vigentes">
          <table className="w-full text-[11px]">
            <tbody>{linhas.map(([n, t]) => <tr key={n} className="border-t border-slate-100"><td className="py-1.5 pr-4 font-semibold text-slate-700 whitespace-nowrap align-top">{n}</td><td className="py-1.5 text-slate-600">{t}</td></tr>)}</tbody>
          </table>
        </Secao>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-5xl">
        <Secao titulo="Snapshot diário">
          <p className="text-[11px] text-slate-600 mb-2">Grava a "foto do dia" de cada item × loja (saldo, classificações, situação, cobertura). Alimenta o histórico da Evolução do Produto. Fase 1: manual; fase 2: automático todo dia.</p>
          <div className="flex items-center gap-3">
            <button type="button" className={btnSec} onClick={snapshot} disabled={!podeSnapshot || snap === 'Gravando...'}><Camera className="h-3.5 w-3.5" /> Gerar snapshot do dia</button>
            {!podeSnapshot && <span className="text-[11px] text-slate-500">Seu grupo não tem a ação "Gerar Snapshot".</span>}
            {snap && <span className="text-[11px] text-slate-600">{snap}</span>}
          </div>
        </Secao>
      </div>
    </PaginaPecas>
  )
}
