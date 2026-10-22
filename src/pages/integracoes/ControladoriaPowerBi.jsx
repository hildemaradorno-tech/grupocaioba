import React, { useState } from 'react'
import { Copy, Check, AlertTriangle, Database, Plug, Cloud, ListChecks, LifeBuoy, Layers } from 'lucide-react'

// Dados públicos de conexão. A chave de API NUNCA fica aqui: ela é copiada do painel do Supabase.
const PROJECT_URL = 'https://bedcugjisvhyswdqlpgw.supabase.co'

const CONEXAO = [
  { rotulo: 'Project URL', valor: PROJECT_URL },
  { rotulo: 'Caminho da view', valor: '/rest/v1/<nome_da_view>' },
  { rotulo: 'Cabeçalho (nome)', valor: 'apikey' },
  { rotulo: 'Cabeçalho (valor)', valor: null, nota: 'Chave Publishable do projeto. Copie em Supabase → Project Settings → API Keys.' },
  { rotulo: 'Autenticação no Power BI', valor: 'Anônimo' },
]

// Views liberadas para leitura pela API (únicas que o Power BI deve usar).
const VIEWS = [
  {
    nome: 'vw_ctb_centros_resultado',
    desc: 'Cadastro dos Centros de Resultado.',
    origem: 'Controladoria → Centro de Resultado',
    colunas: 'centro_resultado_id, codigo, descricao, ativo, sistema_id, sistema, sigla',
  },
  {
    nome: 'vw_ctb_orcamento',
    desc: 'Orçamento por centro de resultado, conta e mês (valores). Já traz conta, linha do DRE e centro por nome.',
    origem: 'Controladoria → Orçamento',
    colunas: 'orcamento_id, ano, mes, data_competencia, valor, conta_id, conta_codigo, conta_descricao, conta_natureza, linha_dre_id, linha_dre_ordem, linha_dre, linha_dre_sinal, centro_resultado_id, centro_resultado_codigo, centro_resultado, centro_resultado_sigla, sistema_id, sistema, atualizado_por, atualizado_em',
  },
  {
    nome: 'vw_ctb_plano_contas',
    desc: 'Plano de Contas com nível, caminho hierárquico, conta pai, grupo e linha do DRE.',
    origem: 'Controladoria → Plano de Contas',
    colunas: 'conta_id, codigo, descricao, tipo, natureza, ativo, nivel, caminho_codigo, caminho_descricao, conta_pai_id, conta_pai_codigo, conta_pai_descricao, grupo_codigo, grupo_descricao, linha_dre_id, linha_dre_ordem, linha_dre, linha_dre_sinal',
  },
  {
    nome: 'vw_ctb_dre_estrutura',
    desc: 'Estrutura (linhas) do DRE, com a quantidade de contas em cada linha.',
    origem: 'Controladoria → DRE',
    colunas: 'linha_dre_id, ordem, linha_dre, tipo, sinal, destaque, ativo, qtd_contas',
  },
]

// Tabelas originais: protegidas (RLS). Com a chave de API pública a leitura volta vazia — usar as views acima.
const TABELAS_PROTEGIDAS = ['ctb_centros_resultado', 'ctb_dre_linhas', 'ctb_orcamento', 'ctb_plano_contas']

const SQL_NOVA_VIEW = `-- 1) crie a view (prefixo vw_ + módulo, ex.: vw_ctb_...)
CREATE OR REPLACE VIEW vw_ctb_exemplo AS
SELECT id, codigo, nome
FROM ctb_exemplo;

-- 2) libere a leitura para a API (necessário para o Power BI enxergar)
GRANT SELECT ON vw_ctb_exemplo TO anon, authenticated;`

const M_PAGINADO = `let
    Base = "${PROJECT_URL}",
    Chave = "COLE_AQUI_A_CHAVE_PUBLISHABLE",
    View = "vw_ctb_orcamento",
    Tamanho = 1000,
    Pagina = (n) =>
        Json.Document(Web.Contents(Base, [
            RelativePath = "rest/v1/" & View,
            Query = [limit = Text.From(Tamanho), offset = Text.From(n * Tamanho)],
            Headers = [apikey = Chave]
        ])),
    Paginas = List.Generate(
        () => [n = 0, dados = Pagina(0)],
        each List.Count([dados]) > 0,
        each [n = [n] + 1, dados = Pagina([n] + 1)],
        each [dados]
    ),
    Lista = List.Combine(Paginas),
    Tabela = Table.FromList(Lista, Splitter.SplitByNothing(), {"Registro"}),
    Colunas = List.Distinct(List.Combine(List.Transform(Lista, Record.FieldNames))),
    Expandida = Table.ExpandRecordColumn(Tabela, "Registro", Colunas)
in
    Expandida`

function Copiar({ texto }) {
  const [ok, setOk] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch { /* clipboard indisponível */ }
  }
  return (
    <button type="button" onClick={copiar} title="Copiar" className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
      {ok ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const Cod = ({ children }) => <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">{children}</code>

function Bloco({ texto }) {
  return (
    <div className="relative">
      <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 rounded-lg p-3 pr-10 overflow-x-auto">{texto}</pre>
      <div className="absolute top-2 right-2"><Copiar texto={texto} /></div>
    </div>
  )
}

function Passo({ n, titulo, children }) {
  return (
    <div className="flex gap-3">
      <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{n}</div>
      <div className="space-y-1.5 min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">{children}</div>
      </div>
    </div>
  )
}

function Caixa({ titulo, icon: Icon, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
        <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
      </header>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  )
}

function Lista({ itens }) {
  return (
    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
      {itens}
    </div>
  )
}

export default function ControladoriaPowerBi() {
  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Integrações · Controladoria</h1>
        <p className="text-xs text-slate-500">Manual de conexão do Power BI com o Supabase para usar os dados da Controladoria (Centro de Resultado, Orçamento, Plano de Contas e DRE).</p>
      </div>

      <Caixa titulo="Como funciona" icon={Plug}>
        <p className="text-xs text-slate-600 leading-relaxed">
          O Supabase expõe cada view <Cod>vw_ctb_*</Cod> por uma API REST (HTTPS). O Power BI lê essa API pelo conector <strong>Página da Web</strong>, em formato JSON.
          Não precisa de gateway, de computador ligado nem de certificado instalado, e a atualização agendada funciona 100% online no Power BI Service.
        </p>
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>A chave de API não é mostrada nesta tela. Copie-a no painel do Supabase. Quem tiver a chave consegue ler as views liberadas: não a divulgue fora da equipe e não libere views com dados sensíveis.</span>
        </div>
      </Caixa>

      <Caixa titulo="Dados de conexão" icon={Database}>
        <Lista itens={CONEXAO.map(c => (
          <div key={c.rotulo} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide w-48 shrink-0">{c.rotulo}</span>
            {c.valor ? (
              <span className="flex items-center gap-1 min-w-0">
                <code className="text-xs font-mono text-slate-800 truncate">{c.valor}</code>
                <Copiar texto={c.valor} />
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic text-right">{c.nota}</span>
            )}
          </div>
        ))} />
      </Caixa>

      <Caixa titulo="Parte 1 — No Supabase" icon={Layers}>
        <Passo n={1} titulo="Conferir que as views existem">
          <p>As views da Controladoria são criadas pela migration <Cod>supabase/migrations/controladoria.sql</Cod> (e ajustadas pelas migrations <Cod>controladoria_centro_*.sql</Cod>). No Supabase, em <strong>Table Editor</strong>, troque o filtro de schema para <Cod>public</Cod> e procure <Cod>vw_ctb_*</Cod>.</p>
        </Passo>
        <Passo n={2} titulo="Pegar a Project URL">
          <p>Em <strong>Project Settings → API</strong> (ou <strong>Data API</strong>), copie a <strong>Project URL</strong>: <Cod>{PROJECT_URL}</Cod>.</p>
        </Passo>
        <Passo n={3} titulo="Pegar a chave de API">
          <p>Em <strong>Project Settings → API Keys</strong>, copie a chave <strong>Publishable</strong> (começa com <Cod>sb_publishable_</Cod>). Em projetos mais antigos, é a chave <Cod>anon / public</Cod> (começa com <Cod>eyJ</Cod>).</p>
          <p>Nunca use a chave <Cod>service_role</Cod> (ou <Cod>secret</Cod>): ela dá acesso total ao banco.</p>
        </Passo>
        <Passo n={4} titulo="Liberar uma view nova para o Power BI (quando criar outra)">
          <p>Toda view nova precisa de <Cod>GRANT SELECT</Cod> para o papel <Cod>anon</Cod>, senão a API responde <Cod>permission denied</Cod>. Execute no <strong>SQL Editor</strong>:</p>
          <Bloco texto={SQL_NOVA_VIEW} />
          <p>Se a view foi criada pelo SQL Editor, o Supabase já concede o acesso por padrão. O <Cod>GRANT</Cod> garante em qualquer caso.</p>
        </Passo>
      </Caixa>

      <Caixa titulo="Parte 2 — No Power BI Desktop" icon={ListChecks}>
        <Passo n={1} titulo="Abrir o conector Web">
          <p>Em <strong>Página Inicial → Obter dados</strong>, digite <strong>Web</strong> na busca e escolha <strong>Página da Web</strong> (categoria "Outros"). Não use "API Web". Clique em <strong>Conectar</strong>.</p>
        </Passo>
        <Passo n={2} titulo="Mudar para Avançado e montar a URL">
          <p>Marque <strong>Avançado</strong>. Em <strong>Partes de URL</strong>, use duas partes (clique em <strong>Adicionar parte</strong> para a segunda):</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>1ª parte: <Cod>{PROJECT_URL}</Cod></li>
            <li>2ª parte: <Cod>/rest/v1/vw_ctb_centros_resultado</Cod> (troque pelo nome da view desejada).</li>
          </ul>
        </Passo>
        <Passo n={3} titulo="Informar o cabeçalho com a chave">
          <p>Em <strong>Parâmetros do cabeçalho de solicitação HTTP</strong>, preencha uma linha:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Caixa da esquerda: <Cod>apikey</Cod></li>
            <li>Caixa da direita: a chave Publishable copiada no Supabase.</li>
          </ul>
          <p>Não adicione o cabeçalho <Cod>Authorization</Cod> com a chave <Cod>sb_publishable_</Cod>: ela não é um JWT e a API responde <Cod>Invalid JWT</Cod>. Só use <Cod>Authorization: Bearer ...</Cod> se a chave for a antiga <Cod>anon</Cod> (<Cod>eyJ...</Cod>).</p>
        </Passo>
        <Passo n={4} titulo="Conectar e transformar">
          <p>Clique em <strong>OK</strong>. Se pedir credenciais, escolha <strong>Anônimo</strong> e clique em <strong>Conectar</strong>. Os dados chegam como lista em JSON: na guia <strong>Transformar</strong>, clique em <strong>Para a Tabela</strong> (aceite o padrão) e, no ícone de expandir da coluna, marque todas as colunas e confirme.</p>
        </Passo>
        <Passo n={5} titulo="Repetir para as outras views e carregar">
          <p>Repita os passos 1 a 4 para cada view que precisar (a mesma chave serve para todas) e clique em <strong>Fechar e Aplicar</strong>. Depois relacione as tabelas no modelo.</p>
        </Passo>
      </Caixa>

      <Caixa titulo="Parte 3 — Publicar e atualizar no Power BI Online" icon={Cloud}>
        <Passo n={1} titulo="Publicar o relatório">
          <p>No Power BI Desktop, clique em <strong>Publicar</strong> e escolha o workspace.</p>
        </Passo>
        <Passo n={2} titulo="Configurar as credenciais da fonte">
          <ol className="list-decimal pl-4 space-y-1">
            <li>No Power BI Service, abra o workspace, clique nos três pontinhos (…) do <strong>modelo semântico</strong> e vá em <strong>Configurações</strong>.</li>
            <li>Expanda <strong>Credenciais da fonte de dados</strong> e clique em <strong>Editar credenciais</strong> na conexão Web.</li>
            <li><strong>Método de autenticação:</strong> Anônimo.</li>
            <li><strong>Nível de privacidade:</strong> Organizacional (ou Nenhum).</li>
            <li>Clique em <strong>Entrar</strong>. A chave de API já vai junto no cabeçalho configurado no Power Query.</li>
          </ol>
        </Passo>
        <Passo n={3} titulo="Agendar a atualização">
          <p>Ainda em <strong>Configurações</strong>, abra <strong>Atualização agendada</strong>, ligue e defina os horários. A atualização roda 100% na nuvem: não precisa de gateway nem de computador ligado. Para testar, use <strong>Atualizar agora</strong>.</p>
        </Passo>
      </Caixa>

      <Caixa titulo="Views disponíveis para leitura" icon={Database}>
        <p className="text-xs text-slate-600 leading-relaxed">Estas são as 4 views da Controladoria liberadas para o Power BI. Cada uma é uma consulta separada: o conector Web lê <strong>um endereço por vez</strong>.</p>
        <div className="space-y-3">
          {VIEWS.map(v => (
            <div key={v.nome} className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 min-w-0">
                  <code className="text-xs font-mono font-bold text-slate-900">{v.nome}</code>
                  <Copiar texto={v.nome} />
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">Alimentada por: {v.origem}</span>
              </div>
              <p className="text-xs text-slate-600">{v.desc}</p>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide shrink-0">2ª parte da URL:</span>
                <code className="text-xs font-mono text-slate-800 truncate">/rest/v1/{v.nome}</code>
                <Copiar texto={`/rest/v1/${v.nome}`} />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed"><strong>Colunas:</strong> {v.colunas}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Uma view sem dados cadastrados devolve lista vazia (<Cod>[]</Cod>): a conexão está certa, só não há registros ainda.</p>
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 text-xs">
          <Database className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span>
            As tabelas originais ({TABELAS_PROTEGIDAS.map((t, i) => <React.Fragment key={t}>{i > 0 && ', '}<Cod>{t}</Cod></React.Fragment>)}) são protegidas:
            pela API com a chave pública elas voltam vazias. Use sempre as views acima.
          </span>
        </div>
      </Caixa>

      <Caixa titulo="Como trazer todas as views (uma consulta por view)" icon={ListChecks}>
        <p className="text-xs text-slate-600 leading-relaxed">Depois de conectar a primeira view (Parte 2), as outras saem por duplicação. Não precisa preencher o cabeçalho de novo.</p>
        <Passo n={1} titulo="Abrir o editor de consultas">
          <p>No Power BI Desktop, clique em <strong>Transformar dados</strong>.</p>
        </Passo>
        <Passo n={2} titulo="Duplicar a consulta que já funciona">
          <p>Na lista de consultas à esquerda, clique com o botão direito em <Cod>vw_ctb_centros_resultado</Cod> e escolha <strong>Duplicar</strong>.</p>
        </Passo>
        <Passo n={3} titulo="Trocar o nome da view na URL">
          <p>Na consulta duplicada, em <strong>Etapas aplicadas</strong> (painel da direita), clique em <strong>Fonte</strong> e troque só a 2ª parte da URL pelo caminho da view desejada, por exemplo <Cod>/rest/v1/vw_ctb_orcamento</Cod>. Clique em <strong>OK</strong>.</p>
          <p>Se a janela do Editor Avançado for mais cômoda, troque o texto <Cod>vw_ctb_centros_resultado</Cod> pelo nome da nova view dentro da linha <Cod>Web.Contents(...)</Cod>.</p>
        </Passo>
        <Passo n={4} titulo="Renomear a consulta">
          <p>Clique com o botão direito na consulta duplicada, escolha <strong>Renomear</strong> e dê o nome da view (ex.: <Cod>vw_ctb_orcamento</Cod>).</p>
        </Passo>
        <Passo n={5} titulo="Repetir para cada view e aplicar">
          <p>Repita os passos 2 a 4 para <Cod>vw_ctb_plano_contas</Cod> e <Cod>vw_ctb_dre_estrutura</Cod>. No fim, clique em <strong>Fechar e Aplicar</strong> e relacione as tabelas no modelo (por exemplo, <Cod>centro_resultado_id</Cod> e <Cod>conta_id</Cod> entre as views).</p>
        </Passo>
        <p className="text-xs text-slate-500">Alternativa: repita o passo a passo completo da Parte 2 para cada view (Obter dados → Página da Web). O resultado é o mesmo.</p>
      </Caixa>

      <Caixa titulo="Mais de 1.000 linhas (paginação)">
        <p className="text-xs text-slate-600 leading-relaxed">A API do Supabase devolve no máximo 1.000 linhas por chamada. Se uma view passar disso (o Orçamento pode passar), os dados chegam cortados. Nesse caso, use <strong>Obter dados → Consulta em branco → Editor Avançado</strong>, cole o código abaixo, troque a chave e o nome da view e clique em <strong>Concluído</strong>. Em seguida configure a credencial como <strong>Anônimo</strong>, igual à Parte 3.</p>
        <Bloco texto={M_PAGINADO} />
        <p className="text-xs text-slate-500">Com a chave antiga <Cod>anon</Cod> (<Cod>eyJ...</Cod>), acrescente também <Cod>Authorization = "Bearer " & Chave</Cod> dentro de <Cod>Headers</Cod>.</p>
      </Caixa>

      <Caixa titulo="Erros comuns" icon={LifeBuoy}>
        <ul className="text-xs text-slate-600 leading-relaxed space-y-2">
          <li><strong>401 / "Invalid API key"</strong>: a chave do cabeçalho <Cod>apikey</Cod> está errada, incompleta ou com espaço sobrando.</li>
          <li><strong>"Invalid JWT"</strong>: foi enviado <Cod>Authorization: Bearer</Cod> com a chave <Cod>sb_publishable_</Cod>. Remova esse cabeçalho.</li>
          <li><strong>404 / "Could not find the table"</strong>: o nome da view na URL está errado ou a view não existe. Confira em <Cod>/rest/v1/vw_ctb_...</Cod>.</li>
          <li><strong>"permission denied for view"</strong>: falta o <Cod>GRANT SELECT ... TO anon</Cod> (Parte 1, passo 4).</li>
          <li><strong>Lista vazia</strong>: a view não tem dados cadastrados ainda.</li>
          <li><strong>Pede credenciais ao atualizar no Power BI Online</strong>: refaça a Parte 3, passo 2, com autenticação <strong>Anônimo</strong>.</li>
          <li><strong>Dados cortados em 1.000 linhas</strong>: use a consulta paginada acima.</li>
        </ul>
      </Caixa>
    </div>
  )
}
