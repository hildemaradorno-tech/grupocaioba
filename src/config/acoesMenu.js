export const ACOES_POR_MENU = [
  {
    menuPath: 'projetos',
    acoes: [
      { value: 'criar',            label: 'Criar Novo Projeto' },
      { value: 'editar',           label: 'Editar Projeto' },
      { value: 'excluir',          label: 'Excluir Projeto' },
      { value: 'duplicar',         label: 'Duplicar Projeto' },
      { value: 'concluir_projeto', label: 'Concluir Projeto' },
      { value: 'criar_tarefa',     label: 'Criar Tarefa' },
      { value: 'editar_tarefa',    label: 'Editar Tarefa' },
      { value: 'excluir_tarefa',   label: 'Excluir Tarefa' },
      { value: 'mover_tarefa',     label: 'Mover Tarefa para Outro Projeto' },
      { value: 'copiar_tarefa',    label: 'Copiar Tarefa para Outro Projeto' },
      { value: 'duplicar_tarefa',  label: 'Duplicar Tarefa' },
      { value: 'resetar_tarefa',   label: 'Resetar Tarefas (zerar status/datas/progresso)' },
      { value: 'iniciar_tarefa',   label: 'Iniciar Tarefa (→ Em Andamento)' },
      { value: 'concluir_tarefa',  label: 'Concluir Tarefa (→ Concluído)' },
      { value: 'deliberacao',      label: 'Criar / Editar / Excluir Deliberações' },
      { value: 'custo',            label: 'Gerenciar Custos e Confirmar Pagamentos' },
    ],
  },
  {
    menuPath: 'projetos/pdca',
    acoes: [
      { value: 'editar_projeto',  label: 'Editar Projeto' },
      { value: 'editar_tarefa',   label: 'Editar Tarefa' },
      { value: 'iniciar_tarefa',  label: 'Iniciar Tarefa (→ Em Andamento)' },
      { value: 'concluir_tarefa', label: 'Concluir Tarefa (→ Concluído)' },
    ],
  },
  {
    menuPath: 'calculo-comissoes',
    acoes: [
      { value: 'calcular',   label: 'Calcular Comissões' },
      { value: 'salvar',     label: 'Salvar Comissões (Rascunho)' },
      { value: 'conferir',   label: 'Conferir Comissões (Gerente)' },
      { value: 'salvar_pdf', label: 'Salvar PDF' },
      { value: 'processar',  label: 'Processar p/ Pagamento e Autorizar Reprocessamento (RH)' },
      { value: 'excluir',    label: 'Excluir Histórico' },
    ],
  },
  {
    menuPath: 'garantias-daf',
    acoes: [
      { value: 'editar',  label: 'Editar OS' },
      { value: 'excluir', label: 'Excluir OS' },
    ],
  },
  {
    menuPath: 'garantias-daf-faturadas',
    acoes: [
      { value: 'editar',  label: 'Editar OS' },
      { value: 'excluir', label: 'Excluir OS' },
    ],
  },
  {
    menuPath: 'garantias-daf-titulos',
    acoes: [
      { value: 'editar', label: 'Editar Título (observação)' },
    ],
  },
]

export const ACOES_POR_PATH = Object.fromEntries(ACOES_POR_MENU.map(m => [m.menuPath, m.acoes]))
