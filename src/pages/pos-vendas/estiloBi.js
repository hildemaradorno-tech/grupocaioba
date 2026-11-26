// Padrão visual dos BIs de fundo escuro (mesmo do BI Possibilidades — Sintonia do Dia), pedido do usuário 25/11/2026:
// abas tipo "pasta" (ativa azul-marinho #1a4d8f), botões de escolha em caixa alta (cinza quando selecionado),
// seletores no cinza do botão selecionado e rótulos claros ao lado (fundo da página #020617).

export const FUNDO_BI = 'bg-[#020617]'

export const abaBi = (ativa) => `inline-flex items-center gap-1.5 px-4 rounded-t-md border border-b-0 text-[11px] font-semibold uppercase transition-colors ${
  ativa
    ? 'py-2 bg-[#1a4d8f] border-[#1a4d8f] text-white shadow-sm'
    : 'py-1.5 bg-gradient-to-b from-white to-slate-100 border-slate-300 text-slate-500 hover:text-slate-800 hover:to-slate-50'}`

export const botaoBi = (ativo) => `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md border text-[11px] font-semibold uppercase transition-colors ${
  ativo
    ? 'bg-slate-600 border-slate-600 text-white shadow-sm'
    : 'bg-gradient-to-b from-white to-slate-100 border-slate-300 text-slate-500 hover:text-slate-800 hover:to-slate-50'}`

export const seletorBi = 'h-8 pl-3 pr-8 rounded-md border border-slate-600 bg-slate-600 text-[11px] font-semibold uppercase text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300/50 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed'

export const opcaoBi = 'bg-white text-slate-800 normal-case'

export const rotuloBi = 'text-[10px] font-bold uppercase tracking-wide text-slate-200'
