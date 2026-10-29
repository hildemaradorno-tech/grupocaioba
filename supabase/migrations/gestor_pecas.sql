-- ============================================================
-- Gestor de Peças 2.0 — tabelas de parâmetros, decisões do usuário e snapshot diário.
-- Os dados de estoque/vendas/compras NÃO ficam aqui: vêm do backend (fase 1 simulados,
-- fase 2 relatórios Dealer.net no SharePoint). Aqui ficam só o que o usuário decide/ajusta
-- e a foto diária usada na Evolução do Produto.
-- RLS: leitura e escrita só para quem tem menu do módulo ('pecas/...' ou 'bi/gestor-pecas') ou admin.
-- Reversão: DROP TABLE public.pec_ia_analise, public.pec_snapshot_item, public.pec_promocao_itens,
--           public.pec_promocao, public.pec_transferencia, public.pec_sugestao_compra, public.pec_parametros;
-- ============================================================

-- Parâmetros do motor (linha única id=1; JSON no formato de PARAMETROS_PADRAO em engine.js)
CREATE TABLE IF NOT EXISTS public.pec_parametros (
  id              int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  valores         jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_por  text
);
INSERT INTO public.pec_parametros (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Sugestões de compra revisadas (aprovar / editar qtd / rejeitar)
CREATE TABLE IF NOT EXISTS public.pec_sugestao_compra (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia  date NOT NULL,
  codigo           text NOT NULL,
  descricao        text,
  empresa_nome     text NOT NULL,
  fornecedor       text,
  qtd_sugerida     numeric NOT NULL DEFAULT 0,
  qtd_aprovada     numeric,
  custo_unitario   numeric,
  status           text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente','Aprovada','Rejeitada','Pedido emitido')),
  observacao       text,
  usuario          text,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data_referencia, codigo, empresa_nome)
);

-- Transferências entre lojas (geradas a partir da Realocação)
CREATE TABLE IF NOT EXISTS public.pec_transferencia (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text NOT NULL,
  descricao        text,
  loja_origem      text NOT NULL,
  loja_destino     text NOT NULL,
  qtd              numeric NOT NULL,
  custo_unitario   numeric,
  motivo           text,
  status           text NOT NULL DEFAULT 'Sugerida' CHECK (status IN ('Sugerida','Aprovada','Enviada','Recebida','Cancelada')),
  observacao       text,
  usuario          text,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- Campanhas promocionais
CREATE TABLE IF NOT EXISTS public.pec_promocao (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  data_inicio      date NOT NULL,
  data_fim         date NOT NULL,
  status           text NOT NULL DEFAULT 'Planejada' CHECK (status IN ('Planejada','Ativa','Encerrada','Cancelada')),
  observacao       text,
  usuario          text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pec_promocao_itens (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocao_id        uuid NOT NULL REFERENCES public.pec_promocao(id) ON DELETE CASCADE,
  codigo             text NOT NULL,
  descricao          text,
  empresa_nome       text,
  qtd_alvo           numeric,
  preco_original     numeric,
  desconto_pct       numeric,
  preco_promocional  numeric,
  custo_unitario     numeric,
  vendas_antes_mes   numeric,   -- média mensal antes da campanha (para medir resultado)
  UNIQUE (promocao_id, codigo, empresa_nome)
);

-- Foto diária por item × loja (Evolução do Produto / histórico de classes)
CREATE TABLE IF NOT EXISTS public.pec_snapshot_item (
  data            date NOT NULL,
  codigo          text NOT NULL,
  empresa_nome    text NOT NULL,
  fonte           text,
  saldo           numeric,
  valor_estoque   numeric,
  custo_medio     numeric,
  preco           numeric,
  vendas12        numeric,
  previsao_mes    numeric,
  abc             text,
  xyz             text,
  freq            text,
  situacao        text,
  cobertura_dias  numeric,
  necessidade     numeric,
  pendente        numeric,
  PRIMARY KEY (data, codigo, empresa_nome)
);
CREATE INDEX IF NOT EXISTS pec_snapshot_item_codigo_idx ON public.pec_snapshot_item (codigo, data);

-- Análises de IA salvas pelo usuário
CREATE TABLE IF NOT EXISTS public.pec_ia_analise (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tela        text NOT NULL,
  filtros     jsonb,
  motor       text,
  resultado   jsonb NOT NULL,
  usuario     text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- RLS por módulo (mesmo critério de fix_seguranca_rls_modulos.sql, já no formato (SELECT ...))
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pec_parametros','pec_sugestao_compra','pec_transferencia','pec_promocao',
                           'pec_promocao_itens','pec_snapshot_item','pec_ia_analise'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS por_modulo ON public.%I', t);
    EXECUTE format('CREATE POLICY por_modulo ON public.%I FOR ALL TO authenticated
                    USING ((SELECT public.sec_tem_menu_like(''pecas/'',''bi/gestor-pecas'')))
                    WITH CHECK ((SELECT public.sec_tem_menu_like(''pecas/'',''bi/gestor-pecas'')))', t);
  END LOOP;
END $$;
