import React, { useEffect, useState } from 'react'
import { Mail, Save, Loader2, Clock, CalendarClock, MessageSquare, Info } from 'lucide-react'
import { apiService } from '../../../services/api'

// Configuração dos e-mails automáticos da Gestão de Projetos (tabela proj_email_config, linha única).
// Abre em pop-up pela engrenagem da tela Projetos. Lida pelo backend (projetosTaskScheduler / manifestacaoScheduler).

const inputCls = 'text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400'

function Linha({ ativo, onAtivo, titulo, children, dica }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border ${ativo ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
      <input type="checkbox" checked={ativo} onChange={e => onAtivo(e.target.checked)} className="w-4 h-4 mt-0.5 cursor-pointer" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className={`text-xs font-bold ${ativo ? 'text-slate-800' : 'text-slate-400'}`}>{titulo}</div>
        {children && <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">{children}</div>}
        {dica && <p className="text-[11px] text-slate-400">{dica}</p>}
      </div>
    </div>
  )
}

export default function ProjEmailConfig() {
  const [cfg, setCfg] = useState(null)
  const [diasManifTxt, setDiasManifTxt] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [salvoEm, setSalvoEm] = useState(null)

  useEffect(() => {
    apiService.getProjEmailConfig()
      .then(d => {
        if (!d) throw new Error('Configuração não encontrada (migration proj_email_config.sql não aplicada).')
        setCfg(d)
        setDiasManifTxt((d.manif_lembrete_dias || []).join(', '))
      })
      .catch(e => setErro(e.message || String(e)))
      .finally(() => setLoading(false))
  }, [])

  const set = (campo, valor) => { setCfg(prev => ({ ...prev, [campo]: valor })); setSalvoEm(null) }

  const salvar = async () => {
    const dias = [...new Set(diasManifTxt.split(/[,;\s]+/).map(s => parseInt(s, 10)).filter(n => n >= 1 && n <= 30))].sort((a, b) => a - b)
    if (cfg.manif_lembrete_ativo && dias.length === 0) { alert('Informe pelo menos um dia para o lembrete da Manifestação (ex.: 1, 2).'); return }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cfg.horario_envio || '')) { alert('Horário inválido.'); return }
    setSalvando(true)
    try {
      const d = await apiService.updateProjEmailConfig({
        horario_envio: cfg.horario_envio,
        tarefa_antes_ativo: cfg.tarefa_antes_ativo,
        tarefa_antes_dias: Math.min(30, Math.max(1, Number(cfg.tarefa_antes_dias) || 1)),
        tarefa_no_dia_ativo: cfg.tarefa_no_dia_ativo,
        tarefa_atraso_ativo: cfg.tarefa_atraso_ativo,
        tarefa_atraso_dias: Math.min(30, Math.max(1, Number(cfg.tarefa_atraso_dias) || 1)),
        tarefa_copiar_resp_projeto: cfg.tarefa_copiar_resp_projeto,
        tarefa_copia_emails: (cfg.tarefa_copia_emails || '').trim() || null,
        manif_lembrete_ativo: cfg.manif_lembrete_ativo,
        manif_lembrete_dias: dias.length ? dias : [1, 2],
        manif_encerrar_auto: cfg.manif_encerrar_auto,
      })
      setCfg(d)
      setDiasManifTxt((d.manif_lembrete_dias || []).join(', '))
      setSalvoEm(new Date())
    } catch (e) {
      alert('Erro ao salvar: ' + (e.message || String(e)))
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>
  if (erro) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-xs text-slate-700">{erro}</div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-md">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2"><Mail className="h-5 w-5 text-slate-500" /> Configurar E-mails</h1>
          <p className="text-xs text-slate-500">E-mails automáticos da Gestão de Projetos.</p>
        </div>
        <div className="flex items-center gap-3">
          {salvoEm && <span className="text-[11px] font-semibold text-green-600">Salvo</span>}
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
        </div>
      </div>

      {/* Horário */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Horário de envio</h2>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          Todo dia às
          <input type="time" value={cfg.horario_envio || '08:00'} onChange={e => set('horario_envio', e.target.value)} className={inputCls} />
          <span className="text-slate-400">(horário de Campo Grande)</span>
        </div>
        <p className="text-[11px] text-slate-400">Vale para os avisos de tarefa e para o lembrete/encerramento da Manifestação. O envio pode atrasar até 5 minutos.</p>
      </section>

      {/* 1. Tarefas */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Aviso de vencimento de tarefa</h2>
        <p className="text-[11px] text-slate-400">Vai para o responsável pela tarefa. Tarefas concluídas ou canceladas não recebem aviso. O mesmo aviso nunca é enviado duas vezes.</p>
        <Linha ativo={cfg.tarefa_antes_ativo} onAtivo={v => set('tarefa_antes_ativo', v)} titulo="Antes do término">
          <input type="number" min="1" max="30" value={cfg.tarefa_antes_dias} disabled={!cfg.tarefa_antes_ativo}
            onChange={e => set('tarefa_antes_dias', e.target.value)} className={`${inputCls} w-16 text-center`} />
          dia(s) antes da data de término
        </Linha>
        <Linha ativo={cfg.tarefa_no_dia_ativo} onAtivo={v => set('tarefa_no_dia_ativo', v)} titulo="No dia do término" />
        <Linha ativo={cfg.tarefa_atraso_ativo} onAtivo={v => set('tarefa_atraso_ativo', v)} titulo="Atraso">
          <input type="number" min="1" max="30" value={cfg.tarefa_atraso_dias} disabled={!cfg.tarefa_atraso_ativo}
            onChange={e => set('tarefa_atraso_dias', e.target.value)} className={`${inputCls} w-16 text-center`} />
          dia(s) depois da data de término, avisando o atraso
        </Linha>

        <div className="pt-2 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Quem recebe em cópia</div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={cfg.tarefa_copiar_resp_projeto} onChange={e => set('tarefa_copiar_resp_projeto', e.target.checked)} className="w-4 h-4" />
            Responsável(is) do projeto
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Outros e-mails (separe por vírgula):</span>
            <input type="text" value={cfg.tarefa_copia_emails || ''} onChange={e => set('tarefa_copia_emails', e.target.value)}
              placeholder="ex.: gestor@empresa.com.br, pmo@empresa.com.br" className={`${inputCls} w-full`} />
          </div>
        </div>
      </section>

      {/* 2. Manifestação */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Período de Manifestação (automático)</h2>
        <Linha ativo={cfg.manif_lembrete_ativo} onAtivo={v => set('manif_lembrete_ativo', v)} titulo="Lembrete a quem ainda não se manifestou"
          dica="Informe os dias antes do prazo, separados por vírgula (ex.: 1, 2 = avisa 2 dias antes e 1 dia antes).">
          <input type="text" value={diasManifTxt} disabled={!cfg.manif_lembrete_ativo}
            onChange={e => { setDiasManifTxt(e.target.value); setSalvoEm(null) }} className={`${inputCls} w-28`} placeholder="1, 2" />
          dia(s) antes do prazo
        </Linha>
        <Linha ativo={cfg.manif_encerrar_auto} onAtivo={v => set('manif_encerrar_auto', v)} titulo="Encerrar o período automaticamente quando o prazo vencer"
          dica="Desligado: o período fica aberto até alguém encerrar pelo botão do projeto." />
        <p className="text-[11px] text-slate-400 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0" /> Convite, resultado e encerramento pelos botões do projeto continuam sendo enviados na hora, como hoje.</p>
      </section>

      <p className="text-[11px] text-slate-400">
        Remetente: conta de e-mail configurada no servidor (não muda por aqui).
        {cfg.atualizado_por && <> · Última alteração por {cfg.atualizado_por} em {new Date(cfg.atualizado_em).toLocaleString('pt-BR')}</>}
      </p>
    </div>
  )
}
