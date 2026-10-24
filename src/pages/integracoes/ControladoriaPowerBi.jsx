import React, { useState } from 'react'
import { Copy, Check, AlertTriangle, Database, Plug, Cloud, ListChecks, LifeBuoy, Server } from 'lucide-react'

// Dados públicos de conexão. O token NUNCA fica aqui: ele vive na variável POWERBI_TOKEN do backend.
const BACKEND_URL = 'https://portal-gestao-backend-production.up.railway.app'

const CONEXAO = [
  { rotulo: 'Servidor (1ª parte da URL)', valor: BACKEND_URL },
  { rotulo: 'Caminho (2ª parte da URL)', valor: '/api/powerbi/<nome_da_view>' },
  { rotulo: 'Cabeçalho (nome)', valor: 'x-api-key' },
  { rotulo: 'Cabeçalho (valor)', valor: null, nota: 'Token do Power BI. Solicite ao responsável pelo sistema (variável POWERBI_TOKEN do backend).' },
  { rotulo: 'Autenticação no Power BI', valor: 'Anônimo' },
]

// Views liberadas pelo endpoint /api/powerbi (lista fixa em backend/routes/powerbi.js).
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
        <p className="text-xs text-slate-500">Manual de conexão do Power BI com os dados da Controladoria (Centro de Resultado, Orçamento, Plano de Contas e DRE).</p>
      </div>

      <Caixa titulo="Como funciona" icon={Plug}>
        <p className="text-xs text-slate-600 leading-relaxed">
          O banco do Supabase não aceita mais leitura anônima (acesso fechado por segurança). Por isso o Power BI lê as views <Cod>vw_ctb_*</Cod> pelo
          <strong> backend do sistema</strong>, no endereço <Cod>/api/powerbi/&lt;view&gt;</Cod>, usando o conector <strong>Página da Web</strong>. O backend confere um
          token enviado no cabeçalho e devolve todas as linhas da view em JSON. Não precisa de gateway, de computador ligado nem de certificado, e a atualização agendada funciona 100% online no Power BI Service.
        </p>
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>O token não é mostrado nesta tela. Quem o tiver lê as 4 views da Controladoria: não o divulgue fora da equipe e peça outro (troca de token) se ele vazar.</span>
        </div>
      </Caixa>

      <Caixa titulo="Dados de conexão" icon={Database}>
        <Lista itens={CONEXAO.map(c => (
          <div key={c.rotulo} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide w-52 shrink-0">{c.rotulo}</span>
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

      <Caixa titulo="Parte 1 — No sistema e no Railway (administrador)" icon={Server}>
        <Passo n={1} titulo="Entender onde está o endpoint">
          <p>A rota está em <Cod>backend/routes/powerbi.js</Cod> e é publicada em <Cod>/api/powerbi</Cod> (<Cod>backend/server.js</Cod>). Ela lê as views com a service role do backend e só libera as views da lista fixa <Cod>VIEWS</Cod> desse arquivo.</p>
        </Passo>
        <Passo n={2} titulo="Definir o token">
          <p>Gere um valor longo e aleatório (por exemplo, 48 caracteres hexadecimais) e grave na variável <Cod>POWERBI_TOKEN</Cod>:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Local:</strong> em <Cod>backend/.env</Cod>, linha <Cod>POWERBI_TOKEN=...</Cod> (reinicie o backend para ler).</li>
            <li><strong>Produção:</strong> no painel do Railway, serviço do backend → <strong>Variables</strong> → <Cod>POWERBI_TOKEN</Cod>. Salve e aguarde o redeploy.</li>
          </ul>
          <p>Sem a variável, o endpoint responde <Cod>503 powerbi_not_configured</Cod>. Para trocar o token, altere a variável e atualize o cabeçalho no Power BI.</p>
        </Passo>
        <Passo n={3} titulo="Testar a rota">
          <p>No terminal (troque o token):</p>
          <Bloco texto={`curl -H "x-api-key: SEU_TOKEN" ${BACKEND_URL}/api/powerbi/vw_ctb_centros_resultado`} />
          <p>Resposta esperada: uma lista JSON (<Cod>[...]</Cod>). Sem token ou com token errado, <Cod>401 token_invalido</Cod>.</p>
        </Passo>
        <Passo n={4} titulo="Liberar uma view nova para o Power BI">
          <p>Edite o objeto <Cod>VIEWS</Cod> em <Cod>backend/routes/powerbi.js</Cod> e acrescente a view com a coluna que a ordena (por exemplo, o id), e faça o deploy do backend. Views não listadas ali respondem <Cod>404 view_nao_disponivel</Cod>.</p>
          <p>Depois de 30/10, o Supabase não concede mais permissão automática em tabelas/views novas: a migration que criar a view precisa de <Cod>GRANT SELECT ... TO service_role</Cod> (e <Cod>authenticated</Cod>, se o sistema usar). Não conceda nada ao papel <Cod>anon</Cod>.</p>
        </Passo>
      </Caixa>

      <Caixa titulo="Parte 2 — No Power BI Desktop" icon={ListChecks}>
        <Passo n={1} titulo="Abrir o conector Web">
          <p>Em <strong>Página Inicial → Obter dados</strong>, digite <strong>Web</strong> na busca e escolha <strong>Página da Web</strong> (categoria "Outros"). Não use "API Web". Clique em <strong>Conectar</strong>.</p>
        </Passo>
        <Passo n={2} titulo="Mudar para Avançado e montar a URL">
          <p>Marque <strong>Avançado</strong>. Em <strong>Partes de URL</strong>, use duas partes (clique em <strong>Adicionar parte</strong> para a segunda):</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>1ª parte: <Cod>{BACKEND_URL}</Cod></li>
            <li>2ª parte: <Cod>/api/powerbi/vw_ctb_centros_resultado</Cod> (troque pelo nome da view desejada).</li>
          </ul>
        </Passo>
        <Passo n={3} titulo="Informar o cabeçalho com o token">
          <p>Em <strong>Parâmetros do cabeçalho de solicitação HTTP</strong>, preencha uma linha:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Caixa da esquerda: <Cod>x-api-key</Cod></li>
            <li>Caixa da direita: o token fornecido pelo responsável.</li>
          </ul>
          <p>Não use os cabeçalhos <Cod>apikey</Cod> nem <Cod>Authorization</Cod> do Supabase: a conexão agora é com o backend do sistema.</p>
        </Passo>
        <Passo n={4} titulo="Conectar e transformar">
          <p>Clique em <strong>OK</strong>. Se pedir credenciais, escolha <strong>Anônimo</strong> e clique em <strong>Conectar</strong>. Os dados chegam como lista em JSON: na guia <strong>Transformar</strong>, clique em <strong>Para a Tabela</strong> (aceite o padrão) e, no ícone de expandir da coluna, marque todas as colunas e confirme.</p>
        </Passo>
        <Passo n={5} titulo="Carregar">
          <p>Clique em <strong>Fechar e Aplicar</strong>. O backend já devolve todas as linhas, sem o limite de 1.000 do Supabase: não precisa de paginação no Power Query.</p>
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
            <li>Clique em <strong>Entrar</strong>. O token já vai junto no cabeçalho configurado no Power Query.</li>
          </ol>
        </Passo>
        <Passo n={3} titulo="Agendar a atualização">
          <p>Ainda em <strong>Configurações</strong>, abra <strong>Atualização agendada</strong>, ligue e defina os horários. A atualização roda na nuvem, sem gateway. Para testar, use <strong>Atualizar agora</strong>.</p>
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
                <code className="text-xs font-mono text-slate-800 truncate">/api/powerbi/{v.nome}</code>
                <Copiar texto={`/api/powerbi/${v.nome}`} />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed"><strong>Colunas:</strong> {v.colunas}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Uma view sem dados cadastrados devolve lista vazia (<Cod>[]</Cod>): a conexão está certa, só não há registros ainda. As tabelas originais (<Cod>ctb_*</Cod>) não são expostas: use sempre as views.</p>
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
          <p>Na consulta duplicada, em <strong>Etapas aplicadas</strong> (painel da direita), clique em <strong>Fonte</strong> e troque só a 2ª parte da URL pelo caminho da view desejada, por exemplo <Cod>/api/powerbi/vw_ctb_orcamento</Cod>. Clique em <strong>OK</strong>.</p>
          <p>Se preferir o Editor Avançado, troque o texto <Cod>vw_ctb_centros_resultado</Cod> pelo nome da nova view dentro da linha <Cod>Web.Contents(...)</Cod>.</p>
        </Passo>
        <Passo n={4} titulo="Renomear a consulta">
          <p>Clique com o botão direito na consulta duplicada, escolha <strong>Renomear</strong> e dê o nome da view (ex.: <Cod>vw_ctb_orcamento</Cod>).</p>
        </Passo>
        <Passo n={5} titulo="Repetir para cada view e aplicar">
          <p>Repita os passos 2 a 4 para <Cod>vw_ctb_plano_contas</Cod> e <Cod>vw_ctb_dre_estrutura</Cod>. No fim, clique em <strong>Fechar e Aplicar</strong> e relacione as tabelas no modelo (por exemplo, <Cod>centro_resultado_id</Cod> e <Cod>conta_id</Cod> entre as views).</p>
        </Passo>
        <p className="text-xs text-slate-500">Alternativa: repita o passo a passo completo da Parte 2 para cada view (Obter dados → Página da Web). O resultado é o mesmo.</p>
      </Caixa>

      <Caixa titulo="Erros comuns" icon={LifeBuoy}>
        <ul className="text-xs text-slate-600 leading-relaxed space-y-2">
          <li><strong>401 / token_invalido</strong>: o cabeçalho <Cod>x-api-key</Cod> está ausente, com o token errado ou com espaço sobrando.</li>
          <li><strong>503 / powerbi_not_configured</strong>: a variável <Cod>POWERBI_TOKEN</Cod> não está definida no backend (Railway ou <Cod>backend/.env</Cod>).</li>
          <li><strong>404 / view_nao_disponivel</strong>: o nome da view na URL está errado ou a view não está na lista <Cod>VIEWS</Cod> do backend.</li>
          <li><strong>Lista vazia</strong>: a view não tem dados cadastrados ainda.</li>
          <li><strong>Demora ou erro de tempo esgotado</strong>: o backend pode estar iniciando (primeira chamada após ficar parado). Tente atualizar de novo.</li>
          <li><strong>Pede credenciais ao atualizar no Power BI Online</strong>: refaça a Parte 3, passo 2, com autenticação <strong>Anônimo</strong>.</li>
          <li><strong>Erro depois de trocar o token</strong>: atualize o valor do cabeçalho <Cod>x-api-key</Cod> em cada consulta (Fonte) e nas credenciais do Power BI Online.</li>
        </ul>
      </Caixa>
    </div>
  )
}
