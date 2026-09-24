import React, { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { detectarArquivo, lerMenus, lerBotoes, montarPlano } from './importarMenusExcel'

const LIMITE_LISTA = 200

function Cartao({ rotulo, valor, cor = 'text-slate-800' }) {
  return (
    <div className="border border-slate-200 rounded-md px-3 py-2 bg-white">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{rotulo}</div>
      <div className={`text-lg font-bold ${cor}`}>{valor}</div>
    </div>
  )
}

function ListaRecolhivel({ titulo, itens, render }) {
  if (itens.length === 0) return null
  return (
    <details className="border border-slate-200 rounded-md bg-white">
      <summary className="px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">{titulo} ({itens.length})</summary>
      <ul className="max-h-48 overflow-y-auto border-t border-slate-100 divide-y divide-slate-50 text-xs text-slate-600">
        {itens.slice(0, LIMITE_LISTA).map((it, i) => <li key={i} className="px-3 py-1">{render(it)}</li>)}
        {itens.length > LIMITE_LISTA && <li className="px-3 py-1 text-slate-400">… e mais {itens.length - LIMITE_LISTA}</li>}
      </ul>
    </details>
  )
}

const ARQUIVOS = {
  menus: { titulo: 'Menus e submenus', relatorio: 'RSG001_MENUGRUPOACESSO' },
  botoes: { titulo: 'Botões', relatorio: 'RSG003_MENUGRUPOACESSODETALHE' },
}

// Deixa o catálogo de menus/submenus/botões do Dealer.net igual aos relatórios do Dealer.net:
// RSG001 (menus e submenus) e RSG003 (botões) — um complementa o outro, então o ideal é importar
// os dois juntos. Cria, atualiza e exclui; as marcações dos grupos não são alteradas (só saem as
// dos itens excluídos, por cascata).
export default function ImportarMenusModal({ sistema, menus, marcados, onClose, onImportado }) {
  const inputs = { menus: useRef(null), botoes: useRef(null) }
  const [fontes, setFontes] = useState({}) // { menus?: { nome, dados }, botoes?: { nome, dados } }
  const [confirmoExclusao, setConfirmoExclusao] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState(null)

  const handleArquivo = (tipoEsperado) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setLendo(true)
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const tipo = detectarArquivo(linhas)
      if (!tipo) throw new Error('Arquivo não reconhecido — use o RSG001_MENUGRUPOACESSO (menus) ou o RSG003_MENUGRUPOACESSODETALHE (botões).')
      if (tipo !== tipoEsperado) {
        throw new Error(`Esse arquivo é o ${ARQUIVOS[tipo].relatorio} (${ARQUIVOS[tipo].titulo.toLowerCase()}) — escolha-o no campo correspondente.`)
      }
      const dados = tipo === 'menus' ? lerMenus(linhas) : lerBotoes(linhas)
      setFontes(prev => ({ ...prev, [tipo]: { nome: file.name, dados } }))
      setConfirmoExclusao(false)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setLendo(false)
      e.target.value = ''
    }
  }

  const remover = (tipo) => {
    setFontes(prev => { const n = { ...prev }; delete n[tipo]; return n })
    setConfirmoExclusao(false)
  }

  const plano = useMemo(() => {
    if (!fontes.menus && !fontes.botoes) return null
    return montarPlano(menus, { menus: fontes.menus?.dados, botoes: fontes.botoes?.dados })
  }, [fontes, menus])

  const st = plano?.stats
  const temExclusao = !!plano && plano.excluir.length > 0
  const nadaAFazer = !!plano && plano.criar.length === 0 && plano.atualizar.length === 0 && !temExclusao
  // Marcações de grupos que somem junto com os itens excluídos.
  const marcacoesAfetadas = useMemo(() => {
    if (!plano || !marcados) return 0
    const ids = new Set(plano.removidosIds)
    let n = 0
    marcados.forEach(chave => { if (ids.has(chave.split('::')[1])) n++ })
    return n
  }, [plano, marcados])

  const aplicar = async () => {
    setAplicando(true)
    setErro(null)
    try {
      const res = await apiService.aplicarImportacaoGovernancaMenus({
        sistema,
        criar: plano.criar,
        atualizar: plano.atualizar.map(a => ({ id: a.id, campos: a.campos })),
        excluirIds: plano.excluir.map(x => x.id),
      })
      onImportado(res)
    } catch (err) {
      setErro(err.message || String(err))
      setAplicando(false)
    }
  }

  const seletor = (tipo) => {
    const f = fontes[tipo]
    return (
      <div className="border border-slate-200 rounded-md p-3 flex items-center gap-3 bg-white">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-800">{ARQUIVOS[tipo].titulo}</div>
          <div className="text-[10px] text-slate-400">{ARQUIVOS[tipo].relatorio}</div>
          <div className="text-xs text-slate-500 truncate mt-0.5">{f ? f.nome : 'Nenhum arquivo escolhido'}</div>
        </div>
        <input ref={inputs[tipo]} type="file" accept=".xlsx,.xls" onChange={handleArquivo(tipo)} className="hidden" />
        <button
          onClick={() => inputs[tipo].current?.click()}
          disabled={lendo || aplicando}
          className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {f ? 'Trocar' : 'Escolher'}
        </button>
        {f && (
          <button onClick={() => remover(tipo)} disabled={aplicando} className="text-slate-400 hover:text-red-600" title="Remover arquivo"><X className="h-4 w-4" /></button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border border-slate-200 w-[760px] max-w-full max-h-[90vh] shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            Importar Excel — Menus, submenus e botões ({sistema})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Os menus e submenus vêm do relatório <strong>RSG001</strong> e os botões do <strong>RSG003</strong>. Um complementa o outro, então importe
            os dois. Cada arquivo cria, atualiza e exclui a sua parte para o catálogo ficar <strong>exatamente como o arquivo</strong>. Os itens novos
            entram sem marcar e as marcações dos grupos <strong>não são alteradas</strong> (só saem as dos itens excluídos).
          </p>

          <div className="grid grid-cols-2 gap-3">
            {seletor('menus')}
            {seletor('botoes')}
          </div>
          {lendo && <div className="text-xs text-slate-500">Lendo arquivo...</div>}
          {plano && !(fontes.menus && fontes.botoes) && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Só o arquivo de {fontes.menus ? 'menus e submenus' : 'botões'} foi escolhido — a outra parte do catálogo fica como está.
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
            </div>
          )}

          {plano && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Cartao rotulo="Menus/submenus a criar" valor={st.criarMenus} cor="text-blue-700" />
                <Cartao rotulo="Botões a criar" valor={st.criarBotoes} cor="text-blue-700" />
                <Cartao rotulo="A atualizar (nome/posição)" valor={st.atualizar} cor="text-blue-700" />
                <Cartao rotulo="Itens a excluir" valor={st.itensAExcluir} cor={st.itensAExcluir ? 'text-red-600' : 'text-slate-800'} />
                <Cartao rotulo="Botões sem menu" valor={st.semMenu} cor={st.semMenu ? 'text-amber-600' : 'text-slate-800'} />
                <Cartao rotulo="Legado (*) ignorados" valor={st.legado} />
              </div>

              <div className="space-y-2">
                <ListaRecolhivel titulo="Menus, submenus e relatórios que serão criados" itens={plano.criar.filter(c => c.tipo !== 'botao')} render={i => i.caminho} />
                <ListaRecolhivel titulo="Botões que serão criados" itens={plano.criar.filter(c => c.tipo === 'botao')} render={i => i.caminho} />
                <ListaRecolhivel titulo="Itens que serão atualizados" itens={plano.atualizar} render={i => i.campos.nome ? `${i.caminho} (antes: "${i.nomeAntigo}")` : `${i.caminho} (posição/pai)`} />
                <ListaRecolhivel titulo="Botões sem menu correspondente no catálogo — importe o RSG001 junto" itens={plano.semMenu} render={i => `${i.codigo} — ${i.nome}`} />
                <ListaRecolhivel titulo="Legado (*) — não existem na tela real do Dealer.net, ignorados" itens={plano.legado} render={i => `${i.codigo} — ${i.nome}`} />
              </div>

              {temExclusao && (
                <div className="border border-red-200 bg-red-50/60 rounded-md p-3 space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>{st.itensAExcluir} item(ns)</strong> do catálogo (em {st.ramosAExcluir} ramo(s)) não estão nos arquivos e serão excluídos, junto com tudo que há dentro deles.
                    {marcacoesAfetadas > 0 && <> <strong className="text-red-700">{marcacoesAfetadas} marcação(ões)</strong> de grupos nesses itens serão apagadas.</>}
                  </p>
                  <ListaRecolhivel titulo="Ramos que serão excluídos (com o total de itens dentro)" itens={plano.excluir} render={i => `${i.caminho} — ${i.itens} item(ns)`} />
                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmoExclusao}
                      onChange={e => setConfirmoExclusao(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 accent-red-600"
                    />
                    <span>Confirmo a exclusão desses itens do catálogo.</span>
                  </label>
                </div>
              )}

              {nadaAFazer && (
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> O catálogo já está igual aos arquivos — nada a importar.
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} disabled={aplicando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60">Cancelar</button>
          <button
            onClick={aplicar}
            disabled={!plano || nadaAFazer || aplicando || (temExclusao && !confirmoExclusao)}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
          >
            {aplicando ? 'Importando...' : 'Aplicar importação'}
          </button>
        </div>
      </div>
    </div>
  )
}
