-- Gestão de Projetos — configuração dos e-mails automáticos (16/11/2026).
-- Uma linha só (id = 1), editada pela engrenagem da tela Projetos › Configurar E-mails (menu projetos/config-emails).
-- Lida pelo backend (service role) em projetosTaskScheduler.js e manifestacaoScheduler.js.
-- Valores iniciais = regras que estavam fixas no código (nada muda até alguém editar),
-- exceto o horário, que agora é no fuso de Campo Grande (antes 08:00 UTC = 04:00 de Campo Grande).
CREATE TABLE IF NOT EXISTS proj_email_config (
  id                        int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- horário dos envios automáticos (HH:MM, fuso America/Campo_Grande)
  horario_envio             text NOT NULL DEFAULT '08:00' CHECK (horario_envio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),

  -- 1. Aviso de vencimento de tarefa
  tarefa_antes_ativo        boolean NOT NULL DEFAULT true,
  tarefa_antes_dias         int     NOT NULL DEFAULT 1 CHECK (tarefa_antes_dias BETWEEN 1 AND 30),
  tarefa_no_dia_ativo       boolean NOT NULL DEFAULT true,
  tarefa_atraso_ativo       boolean NOT NULL DEFAULT true,
  tarefa_atraso_dias        int     NOT NULL DEFAULT 1 CHECK (tarefa_atraso_dias BETWEEN 1 AND 30),
  tarefa_copiar_resp_projeto boolean NOT NULL DEFAULT false,   -- cópia para o(s) responsável(is) do projeto
  tarefa_copia_emails       text,                              -- cópia fixa (e-mails separados por vírgula ou ;)

  -- 2. Período de Manifestação (automático)
  manif_lembrete_ativo      boolean NOT NULL DEFAULT true,
  manif_lembrete_dias       int[]   NOT NULL DEFAULT '{1,2}',  -- quantos dias antes do prazo
  manif_encerrar_auto       boolean NOT NULL DEFAULT true,

  -- controle de execução diária (evita rodar 2x no mesmo dia, ex.: localhost + Railway)
  ultima_exec_tarefas       date,
  ultima_exec_manif         date,

  atualizado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_por            text
);

-- dia de hoje marcado como já executado: a versão antiga já rodou hoje (04:00 de Campo Grande);
-- sem isso o backend novo rodaria de novo assim que ligado.
INSERT INTO proj_email_config (id, ultima_exec_tarefas, ultima_exec_manif)
VALUES (1, (now() AT TIME ZONE 'America/Campo_Grande')::date, (now() AT TIME ZONE 'America/Campo_Grande')::date)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE proj_email_config ENABLE ROW LEVEL SECURITY;

-- Ler e gravar: quem tem o menu Configurar E-mails (admin sempre pode). O backend usa service role.
DROP POLICY IF EXISTS sel_menu ON proj_email_config;
DROP POLICY IF EXISTS upd_menu ON proj_email_config;
CREATE POLICY sel_menu ON proj_email_config FOR SELECT TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['projetos/config-emails'])));
CREATE POLICY upd_menu ON proj_email_config FOR UPDATE TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['projetos/config-emails'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['projetos/config-emails'])));

NOTIFY pgrst, 'reload schema';
