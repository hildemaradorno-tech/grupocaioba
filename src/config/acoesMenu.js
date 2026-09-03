export const ACOES_POR_MENU = [
  {
    menuPath: 'projetos',
    acoes: [
      { value: 'criar',            label: 'Criar Novo Projeto' },
      { value: 'editar',           label: 'Editar Projeto' },
      { value: 'excluir',          label: 'Excluir Projeto' },
      { value: 'duplicar',         label: 'Duplicar Projeto' },
      { value: 'concluir_projeto', label: 'Concluir Projeto' },
      { value: 'alterar_status',        label: 'Alterar Status do Projeto' },
      { value: 'criar_tarefa',          label: 'Criar Tarefa' },
      { value: 'alterar_status_tarefa', label: 'Alterar Status da Tarefa' },
      { value: 'editar_tarefa',         label: 'Editar Tarefa' },
      { value: 'excluir_tarefa',   label: 'Excluir Tarefa' },
      { value: 'mover_tarefa',     label: 'Mover Tarefa para Outro Projeto' },
      { value: 'copiar_tarefa',    label: 'Copiar Tarefa para Outro Projeto' },
      { value: 'duplicar_tarefa',  label: 'Duplicar Tarefa' },
      { value: 'resetar_tarefa',   label: 'Resetar Tarefas (zerar status/datas/progresso)' },
      { value: 'iniciar_tarefa',   label: 'Iniciar Tarefa (→ Em Andamento)' },
      { value: 'concluir_tarefa',  label: 'Concluir Tarefa (→ Concluído)' },
      { value: 'deliberacao',      label: 'Criar / Editar / Excluir Deliberações' },
      { value: 'custo',            label: 'Gerenciar Custos e Confirmar Pagamentos' },
      { value: 'iniciar_fase',          label: 'Iniciar Fase do Projeto' },
      { value: 'enviar_manifestacao',   label: 'Enviar Manifestação / De Acordo' },
    ],
  },
  {
    menuPath: 'projetos/manifestacoes',
    acoes: [
      { value: 'responder_manifestacao',   label: 'Responder / Aprovar Manifestação' },
      { value: 'encerrar_periodo',         label: 'Encerrar Período de Manifestação' },
      { value: 'gerenciar_participantes',  label: 'Gerenciar Participantes (Adicionar / Remover)' },
    ],
  },
  {
    menuPath: 'calculo-comissoes',
    acoes: [
      { value: 'calcular',   label: 'Calcular Comissões' },
      { value: 'salvar',     label: 'Salvar Comissões (Rascunho)' },
      { value: 'conferir',   label: 'Conferir Comissões (Gerente)' },
      { value: 'salvar_pdf', label: 'Salvar PDF' },
      { value: 'excluir',    label: 'Excluir Histórico' },
    ],
  },
  {
    menuPath: 'processamento-comissoes',
    acoes: [
      { value: 'confirmar_conferencia', label: 'Confirmar Conferência (DP)' },
      { value: 'processar', label: 'Processar p/ Pagamento e Autorizar Reprocessamento (RH/Seletiva)' },
      { value: 'excluir', label: 'Excluir Lote (reabre pra recalcular)' },
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
  {
    menuPath: 'auditoria-externa/ciclos',
    acoes: [
      { value: 'editar',  label: 'Editar Ciclo de Auditoria' },
      { value: 'excluir', label: 'Excluir Ciclo de Auditoria' },
    ],
  },
  {
    menuPath: 'auditoria-externa/divergencias',
    acoes: [
      { value: 'editar_achado',       label: 'Criar / Editar Achado' },
      { value: 'excluir_achado',      label: 'Excluir Achado' },
      { value: 'editar_divergencia',  label: 'Criar / Editar Divergência' },
      { value: 'excluir_divergencia', label: 'Excluir Divergência' },
      { value: 'usar_diagnostico_ia', label: 'Usar Diagnóstico IA' },
      { value: 'usar_chat_ia',        label: 'Usar Chat do Copiloto de Auditoria' },
    ],
  },
  {
    menuPath: 'auditoria-externa/plano-acao',
    acoes: [
      { value: 'editar_plano',        label: 'Criar / Editar Plano de Ação' },
      { value: 'validar_plano_acao',  label: 'Validar Plano de Ação (Auditoria)' },
    ],
  },
  {
    menuPath: 'auditoria-externa/tipos-acao',
    acoes: [
      { value: 'editar', label: 'Criar / Editar Tipo de Ação' },
    ],
  },
  {
    menuPath: 'auditoria-externa/impactos',
    acoes: [
      { value: 'editar', label: 'Criar / Editar Impacto' },
    ],
  },
  {
    menuPath: 'sobreaviso-plantao',
    acoes: [
      { value: 'editar',             label: 'Editar Lançamentos' },
      { value: 'excluir',            label: 'Excluir Lançamentos' },
      { value: 'configurar_valores', label: 'Configurar Valores (R$/dia e R$/deslocamento)' },
    ],
  },
]

export const ACOES_POR_PATH = Object.fromEntries(ACOES_POR_MENU.map(m => [m.menuPath, m.acoes]))
