-- Cadastro de relatórios do MicroWork Cloud usados como fonte de dados de comissão
-- (mesmo conceito da Fonte de Cálculo via SharePoint, só que via API). O token de acesso
-- é único pra conta inteira e já existe como variável de ambiente do backend
-- (MICROWORK_API_TOKEN, reaproveitado da integração Honda em backend/services/microworkIntegracao.js)
-- — não fica guardado nesta tabela nem nunca passa pelo navegador.

CREATE TABLE IF NOT EXISTS dim_fontes_microwork (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                            text NOT NULL,
  descricao                       text,
  idrelatorioconfiguracao         integer NOT NULL,
  idrelatorioconsulta             integer NOT NULL,
  idrelatorioconfiguracaoleiaute  integer NOT NULL,
  idrelatoriousuarioleiaute       integer NOT NULL,
  ididioma                        integer NOT NULL DEFAULT 1,
  listaempresas                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Filtros fixos do relatório, no formato "Chave=Valor;Chave=Valor;..." igual o MicroWork exige —
  -- SEM Periododeconclusaoinicial/Periododeconclusaofinal, que o backend calcula a partir do
  -- mês/ano escolhido na tela a cada consulta (ver buscarRelatorioMicrowork em microworkIntegracao.js).
  filtros_fixos                   text,
  ativo                           boolean NOT NULL DEFAULT true,
  criado_em                       timestamptz NOT NULL DEFAULT now(),
  atualizado_em                   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dim_fontes_microwork ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_fontes_microwork;
CREATE POLICY "auth_all" ON dim_fontes_microwork FOR ALL TO authenticated USING (true) WITH CHECK (true);
