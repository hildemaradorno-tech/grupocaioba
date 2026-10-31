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
  // Gestor de Peças 2.0 — Trucks: ações que gravam decisões (sem flag = negado; admin sempre pode)
  {
    menuPath: 'pecas/reposicao',
    acoes: [
      { value: 'aprovar_sugestao', label: 'Aprovar / Rejeitar Sugestão de Compra' },
    ],
  },
  {
    menuPath: 'pecas/transferencias',
    acoes: [
      { value: 'gerar_transferencia', label: 'Gerar e Atualizar Transferências' },
    ],
  },
  {
    menuPath: 'pecas/promocoes',
    acoes: [
      { value: 'criar_promocao', label: 'Criar / Editar Campanhas Promocionais' },
    ],
  },
  {
    menuPath: 'pecas/parametros',
    acoes: [
      { value: 'gerar_snapshot', label: 'Gerar Snapshot do Dia' },
    ],
  },
  {
    menuPath: 'pecas/configuracao',
    acoes: [
      { value: 'editar_parametros', label: 'Editar Parâmetros (classificação e política de compra)' },
    ],
  },
  // Gestor de Peças 2.0 — Motos (mesmas ações)
  {
    menuPath: 'pecas-motos/reposicao',
    acoes: [
      { value: 'aprovar_sugestao', label: 'Aprovar / Rejeitar Sugestão de Compra' },
    ],
  },
  {
    menuPath: 'pecas-motos/transferencias',
    acoes: [
      { value: 'gerar_transferencia', label: 'Gerar e Atualizar Transferências' },
    ],
  },
  {
    menuPath: 'pecas-motos/promocoes',
    acoes: [
      { value: 'criar_promocao', label: 'Criar / Editar Campanhas Promocionais' },
    ],
  },
  {
    menuPath: 'pecas-motos/parametros',
    acoes: [
      { value: 'gerar_snapshot', label: 'Gerar Snapshot do Dia' },
    ],
  },
  {
    menuPath: 'pecas-motos/configuracao',
    acoes: [
      { value: 'editar_parametros', label: 'Editar Parâmetros (classificação e política de compra)' },
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
    // Comissões - HONDA: mesmas ações da DAF, com permissão própria.
    menuPath: 'calculo-comissoes-motos',
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
    menuPath: 'garantias-daf-andamento',
    acoes: [
      { value: 'regras', label: 'Regras do Sistema (engrenagem — alterar prazos)' },
    ],
  },
  {
    menuPath: 'garantias-daf',
    acoes: [
      { value: 'editar',   label: 'Editar OS (Editar Garantia)' },
      { value: 'excluir',  label: 'Excluir OS (individual e em lote)' },
      { value: 'buscar_nf', label: 'Buscar NF das OS não encontradas no SharePoint' },
      { value: 'regras',   label: 'Regras do Sistema (engrenagem — alterar prazos)' },
    ],
  },
  {
    menuPath: 'garantias-daf-historicodeos',
    acoes: [
      { value: 'importar', label: 'Importar OS Faturadas' },
      { value: 'excluir',  label: 'Excluir OS' },
    ],
  },
  {
    menuPath: 'garantias-daf-titulos',
    acoes: [
      { value: 'editar', label: 'Editar Título (observação)' },
      { value: 'editar_garantia', label: 'Editar Faturamento (vincular OS / envio à fábrica)' },
      { value: 'emitir_nota_debito', label: 'Emitir Nota de Débito (dentro de Editar Faturamento)' },
      { value: 'excluir_nota_debito', label: 'Excluir Nota de Débito já emitida' },
    ],
  },
  {
    menuPath: 'garantia/modelos-nota-debito',
    acoes: [
      { value: 'criar',   label: 'Criar Modelo (Novo Modelo / Criar modelos padrão)' },
      { value: 'editar',  label: 'Editar Modelo' },
      { value: 'excluir', label: 'Excluir Modelo' },
    ],
  },
  {
    menuPath: 'auditoria-os-aberto',
    acoes: [
      // Admin tem tudo; demais grupos só o que estiver marcado aqui.
      // Engrenagem
      { value: 'inserir_auditoria',    label: 'Inserir Auditoria (importar OS — SharePoint/MicroWork)' },
      { value: 'excluir_auditoria',    label: 'Excluir Auditoria' },
      { value: 'editar_na_oficina',    label: 'Editar Auditoria (Na Oficina, Responsável e Prazo de fechamento — fora do Modo Conferência)' },
      // Admin reabre qualquer auditoria sem limite; quem tem esta ação reabre só a última da empresa, 1 vez,
      // dentro da janela e do prazo máximo definidos na Regra de Reabertura
      { value: 'reabrir',              label: 'Reabrir Auditoria (última da empresa, 1 vez, dentro da Regra de Reabertura)' },
      // Igual ao Admin: qualquer auditoria, quantas vezes quiser, a qualquer momento, prazo livre
      { value: 'reabrir_sem_limite',   label: 'Reabrir Auditoria a qualquer momento (sem limite, igual ao Admin)' },
      { value: 'cadastrar_situacoes',  label: 'Cadastrar Situações de Auditoria' },
      { value: 'programar_auditorias', label: 'Programar Auditorias (geração automática e Regra de Reabertura)' },
      // Modo Conferência
      { value: 'conferir',             label: 'Conferir — alterar Na Oficina no Modo Conferência' },
      { value: 'pendenciar',           label: 'Pendenciar OS selecionadas (Na Oficina = Não em lote)' },
      { value: 'concluir_conferencia', label: 'Botão Conferido (concluir conferência e definir prazo)' },
      // Modo Relatório
      { value: 'responder_os',         label: 'Responder OS na tabela (Situação, Observação, Dt. Previsão e botão gravar)' },
      { value: 'concluir_respostas',   label: 'Concluir Respostas (encerrar como Respondido Total)' },
      { value: 'voltar_etapa',         label: 'Voltar Etapa (A Responder → Conferência)' },
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
    menuPath: 'auditoria-externa/tipos-divergencia',
    acoes: [
      { value: 'editar',  label: 'Criar / Editar Tipo de Divergência' },
      { value: 'excluir', label: 'Excluir Tipo de Divergência' },
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
  // Controladoria (Configurações → Departamentos → Controladoria)
  ...['controladoria/dre', 'controladoria/plano-contas', 'controladoria/centro-resultado'].map(menuPath => ({
    menuPath,
    acoes: [
      { value: 'editar', label: 'Incluir / Editar' },
      { value: 'excluir', label: 'Excluir' },
    ],
  })),
  {
    menuPath: 'controladoria/orcamento',
    acoes: [
      { value: 'editar', label: 'Editar / Salvar Orçamento' },
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
  // Campanha Pós-Venda (BI) — botões de cada aba.
  {
    menuPath: 'bi/campanha/regras',
    acoes: [
      { value: 'editar',              label: 'Editar e Salvar Regras (Regras-chave, Bônus-alvo, Faixas)' },
      { value: 'zerar',               label: 'Zerar Valores (só a empresa aberta)' },
      { value: 'zerar_todas',         label: 'Zerar Valores de Todas as Empresas' },
      { value: 'copiar_mes_anterior', label: 'Copiar do Mês Anterior (só a empresa aberta)' },
      { value: 'copiar_todas',        label: 'Copiar Valores para Todas as Empresas' },
    ],
  },
  {
    menuPath: 'bi/campanha/apuracao',
    acoes: [
      { value: 'atualizar_numeros', label: 'Atualizar Números (sincroniza Matriz KPIs + Campanha)' },
      { value: 'ver_matriz',        label: 'Ver Bloco 3 da Matriz KPIs (pop-up)' },
      { value: 'fechar_mes',        label: 'Fechar Mês (congela os valores da empresa no mês)' },
      { value: 'reabrir_mes',       label: 'Reabrir Mês Fechado' },
    ],
  },
  {
    menuPath: 'bi/campanha/resultado',
    acoes: [
      { value: 'ver_matriz',        label: 'Ver Bloco 3 da Matriz KPIs (pop-up)' },
      { value: 'ver_calculo',       label: 'Ver Cálculo do Bônus de cada Semana (ⓘ)' },
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
  {
    menuPath: 'kpi/resultados',
    acoes: [
      { value: 'editar', label: 'Atualizar Dados (botão Sincronizar da Matriz)' },
    ],
  },
  {
    menuPath: 'kpi/bloco3-servicos',
    acoes: [
      { value: 'editar', label: 'Editar Peso e Meta Manual' },
    ],
  },
  {
    menuPath: 'kpi/bloco3-pecas',
    acoes: [
      { value: 'editar', label: 'Editar Peso' },
    ],
  },
]

export const ACOES_POR_PATH = Object.fromEntries(ACOES_POR_MENU.map(m => [m.menuPath, m.acoes]))
