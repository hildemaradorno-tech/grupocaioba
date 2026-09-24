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
      { value: 'ver_todos_projetos',    label: 'Ver Todos os Projetos (ignora filtro de departamento)' },
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
    menuPath: 'garantias-daf-historicodeos',
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
    menuPath: 'auditoria-externa/dashboard',
    acoes: [
      { value: 'ver_todos', label: 'Ver Todos (ignorar restrição de Empresa/Departamento do grupo)' },
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
      { value: 'editar_achado',          label: 'Criar / Editar Achado' },
      { value: 'excluir_achado',         label: 'Excluir Achado' },
      { value: 'importar_divergencias',  label: 'Importar Divergências via Excel' },
      { value: 'gerenciar_evidencias',   label: 'Anexar / Remover Evidências (imagens)' },
      { value: 'usar_diagnostico_ia',    label: 'Usar Diagnóstico IA' },
      { value: 'usar_chat_ia',           label: 'Usar Chat do Copiloto de Auditoria' },
    ],
  },
  {
    menuPath: 'auditoria-externa/plano-acao',
    acoes: [
      { value: 'editar_plano',        label: 'Criar / Editar Plano de Ação' },
      { value: 'excluir_plano',       label: 'Excluir Ação do Plano de Ação' },
      { value: 'avancar_status_acao', label: 'Avançar Status da Ação' },
      { value: 'voltar_status_acao',  label: 'Voltar Status da Ação (regredir etapa)' },
      { value: 'validar_plano_acao',  label: 'Validar Plano de Ação (Auditoria)' },
    ],
  },
  {
    menuPath: 'auditoria-externa/tipos-acao',
    acoes: [
      { value: 'editar',  label: 'Criar / Editar Tipo de Ação' },
      { value: 'excluir', label: 'Excluir Tipo de Ação' },
    ],
  },
  {
    menuPath: 'metas/gestao-aprovacao',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
      { value: 'pendenciar', label: 'Pendenciar (reverter uma aprovação de meta)' },
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
  {
    menuPath: 'agrup-cargos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'agrup-departamentos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'agrup-empresas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'areas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'bases-calculo',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'bi/medidas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'box',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'calendario',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'cargos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'politica-comissao',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'cargos-remuneracoes',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'classificacao-compra',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'departamentos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'empresas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'feriados',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'ferias',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'fontes-calculo',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'fontes-microwork',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'fornecedores',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'funcionarios',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'governanca/perfis-acesso',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'metas/pos-vendas/distribuicao-consultores',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'metas/pos-vendas/pecas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'metas/pos-vendas/servicos_pecas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'movimento-venda',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'natureza-operacoes',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'projetos/areas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'projetos/departamentos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'projetos/empresas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'projetos/fases',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'projetos/responsaveis',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'projetos/sistemas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'projetos/status',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'projetos/templates',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'rubricas',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'segmentos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'setores',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'sincronizacao-dados',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
    ],
  },
  {
    menuPath: 'tipos-os',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'tipos-processo',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
  {
    menuPath: 'tipos-produtos',
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  },
]

export const ACOES_POR_PATH = Object.fromEntries(ACOES_POR_MENU.map(m => [m.menuPath, m.acoes]))
