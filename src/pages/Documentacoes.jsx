import React from 'react'
import {
  BookOpen, LayoutGrid, Server, Database, FileSpreadsheet, Cloud, TrainTrack,
  ShieldCheck, ArrowRight, KeyRound, Boxes, Workflow, FolderTree, MapPin,
  Activity, GitBranch, Lock,
} from 'lucide-react'

// Cartão de uma peça da arquitetura (frontend, backend, Supabase, etc.)
function PecaCard({ icon: Icon, titulo, tag, corTag, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
        </div>
        {tag && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${corTag}`}>
            {tag}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{children}</p>
    </div>
  )
}

// Diagrama do ecossistema: quem chama quem, do navegador até o SharePoint.
// SVG nativo (sem lib externa) para não depender de pacotes de diagrama.
function EcossistemaDiagrama() {
  const caixa = (x, y, w, h, titulo, sub, cor) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={cor.bg} stroke={cor.borda} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + h / 2 - (sub ? 7 : -4)} textAnchor="middle" fontSize="13" fontWeight="700" fill={cor.texto}>
        {titulo}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="10" fill={cor.texto} opacity="0.75">
          {sub}
        </text>
      )}
    </g>
  )

  const seta = (x1, y1, x2, y2, label, labelX, labelY) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1.75" markerEnd="url(#seta-ponta)" />
      {label && (
        <text x={labelX} y={labelY} textAnchor="middle" fontSize="10" fill="#64748b" fontStyle="italic">
          {label}
        </text>
      )}
    </g>
  )

  // Paleta alinhada às tags dos PecaCard abaixo
  const cores = {
    usuario:   { bg: '#f8fafc', borda: '#cbd5e1', texto: '#334155' },
    cloudflare:{ bg: '#fff7ed', borda: '#fdba74', texto: '#c2410c' },
    frontend:  { bg: '#eff6ff', borda: '#93c5fd', texto: '#1d4ed8' },
    supabase:  { bg: '#ecfdf5', borda: '#6ee7b7', texto: '#047857' },
    backend:   { bg: '#f5f3ff', borda: '#c4b5fd', texto: '#6d28d9' },
    railway:   { bg: '#f1f5f9', borda: '#cbd5e1', texto: '#334155' },
    azure:     { bg: '#f0f9ff', borda: '#7dd3fc', texto: '#0369a1' },
    sharepoint:{ bg: '#ecfeff', borda: '#67e8f9', texto: '#0e7490' },
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm overflow-x-auto">
      <svg viewBox="0 0 900 470" className="w-full min-w-[640px]" style={{ maxHeight: 470 }}>
        <defs>
          <marker id="seta-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Usuário */}
        {caixa(330, 8, 240, 50, 'Usuário', 'acessa pelo navegador', cores.usuario)}

        {/* Cloudflare hospedando o Frontend */}
        {caixa(260, 108, 380, 62, 'Cloudflare', 'hospeda o Frontend (React + Vite)', cores.cloudflare)}

        {/* Supabase */}
        {caixa(30, 232, 320, 68, 'Supabase', 'banco de dados (Postgres) + login', cores.supabase)}

        {/* Backend Express, rodando no Railway */}
        {caixa(500, 232, 320, 68, 'Backend (Express)', 'hospedado no Railway', cores.backend)}

        {/* Azure AD + Microsoft Graph */}
        {caixa(500, 340, 320, 58, 'Azure AD + Microsoft Graph', 'autenticação e leitura de arquivos', cores.azure)}

        {/* SharePoint */}
        {caixa(500, 428, 320, 40, 'SharePoint', 'planilhas de KPIs, garantias, comissões, férias', cores.sharepoint)}

        {/* Setas */}
        {seta(450, 58, 450, 106, null)}
        {seta(400, 170, 220, 230, 'lê e grava direto', 260, 195)}
        {seta(560, 170, 640, 230, 'chama a API', 640, 195)}
        {seta(660, 300, 660, 338, null)}
        {seta(660, 398, 660, 426, null)}
      </svg>
      <p className="text-[11px] text-slate-400 text-center mt-2">
        A maioria das telas fala direto com o Supabase; só as que dependem do SharePoint (Matriz de KPIs, Garantias,
        Base de Cálculo de Comissões, RH Férias) passam pelo backend no Railway.
      </p>
    </div>
  )
}

function Secao({ titulo, subtitulo, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>}
      </div>
      {children}
    </section>
  )
}

export default function Documentacoes() {
  return (
    <div className="p-8 max-w-screen-xl flex flex-col gap-10">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-1">Documentações</h1>
        <p className="text-lg text-slate-500">Manuais, guias e materiais de apoio</p>
      </div>

      {/* ── O que é ─────────────────────────────────────────────────────── */}
      <Secao titulo="O que é o Portal de Gestão GC">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-700 leading-relaxed">
            O <strong>Portal de Gestão GC</strong> é o sistema interno do Grupo Caioba para centralizar a gestão administrativa,
            comercial e operacional das empresas do grupo. Ele reúne, num único lugar, cadastros corporativos, apuração de metas
            e comissões, indicadores de desempenho (KPIs), gestão de projetos, garantias, férias, documentações internas,
            agendamento de rotinas automatizadas e grades de treinamento — processos que antes ficavam espalhados em planilhas
            soltas, e-mails e sistemas isolados.
          </p>
        </div>
      </Secao>

      {/* ── Para que serve ──────────────────────────────────────────────── */}
      <Secao titulo="Para que serve" subtitulo="Principais frentes cobertas pelo sistema">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PecaCard icon={Boxes} titulo="Cadastros Corporativos">
            Empresas, agrupamentos, departamentos, cargos, funcionários e demais tabelas de apoio que alimentam todos os
            outros módulos do sistema.
          </PecaCard>
          <PecaCard icon={Workflow} titulo="Metas e Comissões">
            Motor de Fonte/Base/Regras de cálculo, apuração de comissões por funcionário e acompanhamento de metas por
            área (peças, serviços, pós-venda, funilaria e pintura).
          </PecaCard>
          <PecaCard icon={LayoutGrid} titulo="Matriz de KPIs">
            Indicadores corporativos e operacionais por bloco (Corporativo, Operacional, Pós-Venda, Peças, Serviços),
            com metas trimestrais e realizado vindo do SharePoint.
          </PecaCard>
          <PecaCard icon={Workflow} titulo="Gestão de Projetos">
            Cadastro de projetos em lista, Gantt e Kanban, com atas de reunião e calendário de ocupação.
          </PecaCard>
          <PecaCard icon={ShieldCheck} titulo="Garantias, Férias e RH">
            Controle de garantias DAF, cálculo e acompanhamento de férias e demais rotinas de recursos humanos.
          </PecaCard>
          <PecaCard icon={BookOpen} titulo="Documentações e Treinamentos">
            Este espaço de documentação, o agendamento de rotinas de RPA/Power BI e a grade de treinamentos obrigatórios
            por cargo e categoria.
          </PecaCard>
        </div>
      </Secao>

      {/* ── Como o sistema funciona por trás ────────────────────────────── */}
      <Secao
        titulo="Como o sistema funciona por trás dos panos"
        subtitulo="As peças de tecnologia que fazem o Portal funcionar e como elas se conectam"
      >
        <EcossistemaDiagrama />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PecaCard icon={LayoutGrid} titulo="Frontend" tag="React + Vite" corTag="bg-blue-50 text-blue-700">
            A parte visual — tudo que aparece na tela — é uma aplicação em <strong>React</strong>, construída com{' '}
            <strong>Vite</strong> e estilizada com <strong>TailwindCSS</strong>. Ela roda inteiramente no navegador do
            usuário: quando alguém acessa o Portal, o navegador baixa esses arquivos e passa a conversar diretamente com
            o Supabase (e, quando necessário, com o backend) para buscar e salvar informações.
          </PecaCard>

          <PecaCard icon={Cloud} titulo="Cloudflare" tag="Hospedagem do site" corTag="bg-orange-50 text-orange-700">
            É onde o frontend fica publicado. O resultado do build do React (a pasta <code>dist</code>) é enviado
            manualmente para o Cloudflare Pages sempre que uma mudança é aprovada — não existe deploy automático: o
            responsável testa tudo no ambiente local primeiro e só depois sobe a nova versão para o Cloudflare.
          </PecaCard>

          <PecaCard icon={Database} titulo="Supabase" tag="Banco de dados + Login" corTag="bg-emerald-50 text-emerald-700">
            É o banco de dados principal do sistema — um <strong>PostgreSQL</strong> na nuvem — e também cuida do{' '}
            <strong>login dos usuários</strong>. A grande maioria dos cadastros, metas, projetos, garantias, RPA e
            treinamentos mora aqui. O frontend acessa o Supabase diretamente (sem passar pelo backend), respeitando as
            permissões de cada grupo de usuário.
          </PecaCard>

          <PecaCard icon={Server} titulo="Backend (Node/Express)" tag="Ponte com o SharePoint" corTag="bg-violet-50 text-violet-700">
            Um servidor próprio, separado do frontend, que existe por um motivo específico: algumas informações (KPIs
            corporativos, garantias, base de cálculo de comissões e férias) ainda vivem em planilhas do{' '}
            <strong>SharePoint</strong> da empresa. Esse backend guarda as credenciais de acesso à Microsoft (que nunca
            podem ficar expostas no navegador) e expõe endpoints simples que o frontend consome.
          </PecaCard>

          <PecaCard icon={TrainTrack} titulo="Railway" tag="Hospedagem do backend" corTag="bg-slate-100 text-slate-700">
            É onde esse servidor Node/Express fica no ar, disponível 24 horas por dia num endereço fixo que o frontend
            chama sempre que precisa de algo que vem do SharePoint.
          </PecaCard>

          <PecaCard icon={FileSpreadsheet} titulo="SharePoint / Microsoft Graph" tag="Fonte de planilhas" corTag="bg-cyan-50 text-cyan-700">
            É onde ficam as planilhas corporativas usadas como fonte de alguns indicadores e controles (KPIs, garantias,
            base de cálculo de comissões, férias). O backend se autentica no <strong>Azure AD</strong> e usa a{' '}
            <strong>Microsoft Graph API</strong> para ler (e em alguns casos gravar) esses arquivos, entregando os dados
            já tratados para o frontend.
          </PecaCard>
        </div>
      </Secao>

      {/* ── Fluxo resumido ───────────────────────────────────────────────── */}
      <Secao titulo="Fluxo resumido de uma tela típica">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">Usuário abre o site (Cloudflare)</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Login via Supabase Auth</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Tela carrega dados</span>
          </div>
          <div className="pl-1 border-l-2 border-slate-100 ml-3 space-y-3">
            <div className="pl-4">
              <p className="text-xs text-slate-600">
                <strong className="text-slate-800">Na maioria dos módulos</strong> (Cadastros, Metas, Projetos, Garantias,
                RPA, Treinamentos...), a tela lê e grava direto no <strong>Supabase</strong> — sem passar pelo backend.
              </p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-slate-600">
                <strong className="text-slate-800">Nas telas que dependem do SharePoint</strong> (Matriz de KPIs,
                Garantias detalhadas, Base de Cálculo de Comissões, RH Férias), o frontend chama o{' '}
                <strong>backend no Railway</strong>, que busca a planilha no SharePoint via Microsoft Graph e devolve os
                dados já prontos para exibição.
              </p>
            </div>
          </div>
        </div>
      </Secao>

      {/* ── Estrutura de pastas ──────────────────────────────────────────── */}
      <Secao titulo="Estrutura de pastas do repositório">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            <FolderTree className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            O código fica num único repositório dividido em duas partes independentes: a <strong>raiz do projeto</strong>{' '}
            é o frontend (React + Vite), com as páginas em <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/pages</code>,
            o menu em <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/config/menuTree.js</code> e as funções
            de acesso ao Supabase em <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/services/supabaseClient.js</code>.
            A pasta <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">backend/</code> é a API Express — um projeto
            Node à parte, com suas próprias rotas (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">backend/routes</code>)
            e serviços de integração com o SharePoint (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">backend/services</code>).
            Os dois são publicados separadamente: o frontend vai para o Cloudflare, o backend para o Railway.
          </p>
        </div>
      </Secao>

      {/* ── Onde cada peça mora ──────────────────────────────────────────── */}
      <Secao titulo="Onde cada peça mora" subtitulo="Endereços reais, para quem precisar localizar algo em produção">
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Frontend — Cloudflare Pages</strong>
              Endereço do site publicado (configurado no painel do Cloudflare Pages da conta responsável pelo projeto).
            </div>
          </div>
          <div className="p-4 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Backend — Railway</strong>
              <code className="bg-slate-100 px-1 py-0.5 rounded">portal-gestao-backend-production.up.railway.app</code>
            </div>
          </div>
          <div className="p-4 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">Supabase — projeto na nuvem</strong>
              <code className="bg-slate-100 px-1 py-0.5 rounded">bedcugjisvhyswdqlpgw.supabase.co</code> — banco, autenticação e
              painel de administração (Table Editor, Auth, políticas de RLS) ficam todos dentro do dashboard do Supabase.
            </div>
          </div>
          <div className="p-4 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-cyan-600 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-0.5">SharePoint / Azure AD</strong>
              Site do SharePoint da Caioba Trucks (planilhas de origem) + aplicativo registrado no Portal do Azure, que dá
              ao backend permissão de leitura via Microsoft Graph.
            </div>
          </div>
        </div>
      </Secao>

      {/* ── Onde monitorar e depurar ─────────────────────────────────────── */}
      <Secao titulo="Onde monitorar e depurar cada peça" subtitulo="Se algo parar de funcionar, é ali que dá para investigar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PecaCard icon={Activity} titulo="Painel do Railway" tag="Backend" corTag="bg-violet-50 text-violet-700">
            Logs em tempo real do servidor Express — é o primeiro lugar para olhar quando uma tela que depende do
            SharePoint (KPIs, Garantias, Comissões, Férias) apresenta erro.
          </PecaCard>
          <PecaCard icon={Database} titulo="Painel do Supabase" tag="Banco e Auth" corTag="bg-emerald-50 text-emerald-700">
            Table Editor para ver os dados diretamente, aba Auth para usuários e sessões, e as políticas de RLS de cada
            tabela — útil quando algo não aparece na tela por causa de permissão.
          </PecaCard>
          <PecaCard icon={Cloud} titulo="Painel do Cloudflare" tag="Frontend" corTag="bg-orange-50 text-orange-700">
            Histórico de builds/deploys do site publicado — mostra qual versão do frontend está no ar e permite reverter
            para uma anterior se preciso.
          </PecaCard>
          <PecaCard icon={ShieldCheck} titulo="Portal do Azure" tag="Autenticação SharePoint" corTag="bg-cyan-50 text-cyan-700">
            Registro do aplicativo usado pelo backend, com as permissões concedidas ao Microsoft Graph — é onde se
            renovam credenciais ou se investigam falhas de autenticação com o SharePoint.
          </PecaCard>
        </div>
      </Secao>

      {/* ── Ambientes ────────────────────────────────────────────────────── */}
      <Secao titulo="Ambientes">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            <GitBranch className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Não existe um ambiente de staging separado: as mudanças são testadas em <strong>localhost</strong> (rodando o
            projeto na máquina de quem desenvolve) e, quando aprovadas, vão direto para o único ambiente de{' '}
            <strong>produção</strong>, no Cloudflare. O deploy do frontend é <strong>manual e intencional</strong> — quem
            publica decide exatamente quando uma mudança vai ao ar, sem pipeline automático de CI/CD.
          </p>
        </div>
      </Secao>

      {/* ── Segurança e permissões ──────────────────────────────────────── */}
      <Secao titulo="Segurança e permissões">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            <KeyRound className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            O acesso é controlado por <strong>grupos de permissão</strong>: cada usuário pertence a um grupo, e cada
            grupo tem acesso liberado a um conjunto específico de menus e ações (visualizar, editar, excluir). Credenciais
            sensíveis — como as chaves de acesso ao SharePoint/Azure AD — ficam apenas no backend (Railway), nunca no
            navegador, exatamente para que essa ponte com o SharePoint exista de forma segura.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0">
            <Lock className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Além das permissões de menu no frontend, o <strong>Supabase</strong> tem <strong>Row Level Security (RLS)</strong>{' '}
            habilitado nas tabelas: a segurança não depende só da tela esconder um botão — o próprio banco de dados
            também impõe regras de acesso a quem está autenticado, como uma segunda camada de proteção independente da
            interface.
          </p>
        </div>
      </Secao>
    </div>
  )
}
