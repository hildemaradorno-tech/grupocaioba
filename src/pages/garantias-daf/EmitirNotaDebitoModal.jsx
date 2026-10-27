import React, { useEffect, useMemo, useState } from 'react'
import { X, FileText, Download, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import { useResponsavelNota } from '../../hooks/useResponsavelNota'
import {
  montarContextoNota, renderizarModelo, gerarPdfDeElemento, fmtDataBR, nomeArquivoNota, valorPecasNotas,
} from '../../utils/notaDebito'

// Data local (toISOString usaria UTC e viraria o dia depois das 21h no horário de Brasília)
const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Gera o PDF de um HTML já preenchido, usando um elemento fora da tela
async function baixarPdf(html, nomeArquivo) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;'
  el.innerHTML = html
  document.body.appendChild(el)
  try {
    // aguarda imagens (logo) carregarem
    await Promise.all([...el.querySelectorAll('img')].map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r })))
    await gerarPdfDeElemento(el, nomeArquivo)
  } finally { document.body.removeChild(el) }
}

export default function EmitirNotaDebitoModal({ garantia, garantiaId, empresas, sigla, statusLabel, usuario, onClose }) {
  const empresa = useMemo(() => (empresas || []).find(e => e.id === garantia.empresa_id) || {}, [empresas, garantia.empresa_id])
  const responsavel = useResponsavelNota()
  const { hasActionOrDefault } = useAuth()
  const canExcluirNota = hasActionOrDefault('garantias-daf-titulos', 'excluir_nota_debito')
  const [confirmarExclusao, setConfirmarExclusao] = useState(null) // id da nota aguardando confirmação
  const [modelos, setModelos] = useState([])
  const [modeloId, setModeloId] = useState('')
  const [emitidas, setEmitidas] = useState([])
  const dataEmissao = hoje()
  // Valor da nota = só peças: soma das DANFEs das Notas Fiscais Emitidas (sem NFs, valor de peças da garantia).
  const valorNotas = useMemo(() => valorPecasNotas(garantia), [garantia.notas_fiscais, garantia.valor_pecas])
  const [descricaoItem, setDescricaoItem] = useState('Peças substituídas em Garantia')
  const [quantidadeItem, setQuantidadeItem] = useState(1)
  // O total do item é sempre o valor de peças das NFs; a quantidade só divide o valor unitário.
  const itens = useMemo(() => {
    const qtd = Number(quantidadeItem) > 0 ? Number(quantidadeItem) : 1
    return [{ descricao: descricaoItem, quantidade: qtd, valor_unitario: valorNotas / qtd }]
  }, [descricaoItem, quantidadeItem, valorNotas])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  const carregar = async () => {
    try {
      const [m, n] = await Promise.all([
        apiService.getModelosNotaDebito(),
        garantiaId ? apiService.getNotasDebitoDaGarantia(garantiaId) : Promise.resolve([]),
      ])
      const ativos = m.filter(x => x.ativo)
      setModelos(ativos)
      setEmitidas(n)
      // O modelo é sempre o vinculado ao tipo de OS da garantia — sem escolha manual.
      const doTipo = ativos.find(x => (x.tipos_codigos || '').split(',').map(s => s.trim().toUpperCase()).includes((sigla || '').toUpperCase()))
      setModeloId(doTipo?.id || '')
    } catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { carregar() }, [])

  const modelo = modelos.find(m => m.id === modeloId)

  const contextoPara = (mod, { numero, data, placaUsada, itensUsados }) => montarContextoNota({
    empresa, garantia, statusLabel, logo: mod?.logo, responsavel,
    nota: { numero, data_emissao: data, placa: placaUsada },
    itens: itensUsados,
  })
  const htmlPara = (mod, args) => renderizarModelo(mod?.conteudo_html || '', contextoPara(mod, args))
  const arquivoPara = (mod, args) => nomeArquivoNota(mod?.nome_arquivo, contextoPara(mod, args))

  const preview = useMemo(
    () => modelo ? htmlPara(modelo, { numero: '', data: dataEmissao, itensUsados: itens }) : '',
    [modelo, dataEmissao, itens, empresa, garantia, statusLabel, responsavel.nome, responsavel.cargo]
  )

  const emitir = async () => {
    if (!modelo) return
    setGerando(true); setErro(null)
    try {
      const nota = await apiService.emitirNotaDebito({
        modelo, garantiaId, empresaId: garantia.empresa_id || null, dataEmissao,
        valorTotal: valorNotas || null,
        dados: { itens, responsavel }, usuario,
      })
      await baixarPdf(
        htmlPara(modelo, { numero: nota.numero, data: dataEmissao, itensUsados: itens }),
        arquivoPara(modelo, { numero: nota.numero, data: dataEmissao, itensUsados: itens })
      )
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setGerando(false) }
  }

  const baixarEmitida = async (n) => {
    const mod = modelos.find(m => m.id === n.modelo_id) || modelo
    if (!mod) { setErro('O modelo desta nota não está mais disponível.'); return }
    setGerando(true); setErro(null)
    try {
      await baixarPdf(
        htmlPara(mod, { numero: n.numero, data: n.data_emissao, placaUsada: n.dados_json?.placa, itensUsados: n.dados_json?.itens || [] }),
        arquivoPara(mod, { numero: n.numero, data: n.data_emissao, placaUsada: n.dados_json?.placa, itensUsados: n.dados_json?.itens || [] })
      )
    } catch (e) { setErro(e.message || String(e)) }
    finally { setGerando(false) }
  }

  const excluirEmitida = async (n) => {
    setGerando(true); setErro(null)
    try {
      await apiService.excluirNotaDebito(n.id)
      setConfirmarExclusao(null)
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setGerando(false) }
  }

  const campoCls = 'w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'
  const lblCls = 'text-[10px] font-bold text-slate-400 uppercase'

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-slate-200 w-[1100px] max-w-full max-h-full shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" /> Emitir Nota de Débito — OS {garantia.numero_os}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : !modelo ? (
          <div className="p-10 text-center text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-amber-700">
              Nenhum modelo de nota de débito cadastrado para o tipo de OS {sigla || 'desta garantia'}.
            </p>
            <p>É preciso cadastrar o modelo e vincular este tipo de OS em:</p>
            <p className="font-semibold text-slate-800">Configurações → Cadastro de Tabelas → Tabelas de Garantia → Modelos de Nota de Débito</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4 p-4 overflow-y-auto">
            <div className="col-span-2 space-y-3">
              {erro && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}
              <div className="flex flex-col gap-1">
                <label className={lblCls}>Modelo</label>
                <p className="text-xs font-semibold text-slate-700 py-2">{modelo.nome}</p>
              </div>

              <div className="space-y-1.5">
                <label className={lblCls}>Item da nota</label>
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  <input className={`${campoCls} col-span-9`} placeholder="Descrição" value={descricaoItem} onChange={e => setDescricaoItem(e.target.value)} />
                  <input className={`${campoCls} col-span-3`} type="number" min="1" step="1" placeholder="Qtd" value={quantidadeItem} onChange={e => setQuantidadeItem(e.target.value)} />
                </div>
              </div>

              {emitidas.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-1">
                  <label className={lblCls}>Notas já emitidas desta garantia</label>
                  {emitidas.map(n => (
                    <div key={n.id} className="flex items-center justify-between text-xs border border-slate-100 rounded px-2 py-1.5">
                      <span><b className="font-mono">{n.numero}</b> · {fmtDataBR(n.data_emissao)} · {n.modelo_nome}</span>
                      {confirmarExclusao === n.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-red-600 font-semibold">Excluir?</span>
                          <button type="button" disabled={gerando} onClick={() => excluirEmitida(n)} className="text-red-600 font-semibold hover:underline">Sim</button>
                          <button type="button" disabled={gerando} onClick={() => setConfirmarExclusao(null)} className="text-slate-500 hover:underline">Não</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <button type="button" disabled={gerando} onClick={() => baixarEmitida(n)} className="text-indigo-600 hover:underline flex items-center gap-1">
                            <Download className="h-3 w-3" /> PDF
                          </button>
                          {canExcluirNota && (
                            <button type="button" disabled={gerando} onClick={() => setConfirmarExclusao(n.id)} title="Excluir esta nota de débito" className="text-red-500 hover:text-red-700 flex items-center">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-3">
              <label className={lblCls}>Pré-visualização (o número é gerado ao emitir)</label>
              <div className="border border-slate-200 rounded-md bg-white overflow-auto max-h-[62vh] mt-1">
                <div style={{ width: 794, zoom: 0.78 }} dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60">Fechar</button>
          <button onClick={emitir} disabled={gerando || !modelo}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {gerando ? 'Gerando...' : 'Emitir e baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
