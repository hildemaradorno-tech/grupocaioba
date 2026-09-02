// Helpers do motor de BI (Medidas/Fontes) — usados pelo Slot no Faturamento em
// BI — Possibilidades pra calcular o valor de uma Medida (Total e cortado por
// Departamento/Setor) a partir de uma única leitura do SharePoint.

// Remove acentos além de trim/uppercase — nomes de funcionário costumam divergir só na
// acentuação entre o relatório do SharePoint e o cadastro (ex: "MENDONÇA" vs "MENDONCA").
const normalizaBusca = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const somaBucket = (b, tipoAgregacao) => {
  if (tipoAgregacao === 'CONTAGEM') return b.linhas
  if (tipoAgregacao === 'CONTAGEM_DISTINTA') return b.distintos.size
  if (tipoAgregacao === 'MEDIA') return b.linhas > 0 ? b.soma / b.linhas : 0
  return b.soma
}
const novoBucket = () => ({ soma: 0, linhas: 0, distintos: new Set() })
const somarNoBucket = (bucket, g) => {
  bucket.soma += g.soma || 0
  bucket.linhas += g.linhas || 0
  if (g.distintos) for (const v of g.distintos) bucket.distintos.add(v)
}
const acumularBucket = (mapa, chave, g) => {
  let bucket = mapa.get(chave)
  if (!bucket) { bucket = novoBucket(); mapa.set(chave, bucket) }
  somarNoBucket(bucket, g)
}

// Calcula o valor de uma Medida CORTADO por Departamento E por Setor — resolve SÓ via Tipo de OS
// da linha (dim_tipos_os.departamento_id + setor_servico→dim_setores.nome_setor, já cadastrados
// em Tipos de O.S.), não por Funcionário: um mesmo funcionário pode faturar em mais de um
// departamento (ex: Balcão e Oficina), então o departamento/setor tem que vir da transação (Tipo
// de OS), não da pessoa. Usado pelas linhas de departamento/setor da tabela de Faturamento em
// BI — Possibilidades — e também pro valor da linha Total, calculado aqui mesmo (somado direto
// dos grupos brutos, sem corte) em vez de uma chamada separada sem dimensão nenhuma, que leria o
// mesmo arquivo do SharePoint de novo só pra agrupar diferente. Retorna { valorTotal: number, valoresPorDepartamento:
// Map<departamentoId | '__sem_departamento__', valor>, valoresPorSetor: Map<setorId, valor>,
// nomesSemDepartamento: Set<string> } — nomesSemDepartamento só pra diagnóstico, mostra o
// Funcionário (quando a Fonte tiver essa coluna) de cada grupo que caiu em "Sem Departamento"
// (Tipo de OS não cadastrado com Departamento — Tipo de OS em BRANCO não cai aqui, é sempre
// tratado como Balcão Peças/Atacado Varejo, venda direta sem Ordem de Serviço).
export async function calcularValoresPorDepartamento(apiService, medida, { empresaLabel, dataInicio, dataFim, tiposOS, setores }) {
  const fonte = medida?.fonte_bi
  const vazio = { valorTotal: 0, valoresPorDepartamento: new Map(), valoresPorSetor: new Map(), nomesSemDepartamento: new Set() }
  if (!fonte?.pasta_sharepoint || !fonte?.prefixo_arquivo || !medida?.coluna_valor || !fonte?.coluna_tipo_os) {
    return vazio
  }
  const regras = await apiService.getRegrasParaCalculoMedidaBi(medida.id)
  const colunasDimensao = { tipo_os: fonte.coluna_tipo_os }
  if (fonte.coluna_funcionario) colunasDimensao.funcionario = fonte.coluna_funcionario
  const res = await apiService.agregarMedidaBi({
    pasta: fonte.pasta_sharepoint, prefixo: fonte.prefixo_arquivo,
    usaSubpastaAno: fonte.usa_subpasta_ano, linhaCabecalho: fonte.linha_cabecalho,
    colunaEmpresa: fonte.coluna_empresa, colunaData: fonte.coluna_data,
    colunaValor: medida.coluna_valor, tipoAgregacao: medida.tipo_agregacao,
    colunasDimensao, empresaNome: empresaLabel, dataInicio, dataFim, regras,
  })

  // Tipo de OS casa por sigla (normalizada, sem acento) ou por código.
  const tipoOsPorSigla = new Map()
  for (const t of (tiposOS || [])) {
    const chave = normalizaBusca(t.sigla)
    if (chave) tipoOsPorSigla.set(chave, t)
  }
  const resolverTipoOs = (bruto) => {
    const alvo = normalizaBusca(bruto)
    if (!alvo) return null
    return tipoOsPorSigla.get(alvo) || (tiposOS || []).find(t => String(t.codigo ?? '').trim() === String(bruto ?? '').trim()) || null
  }
  // Setor do Tipo de OS (texto "Mecânica"/"Funilaria/Pintura"/...) casado por nome contra
  // dim_setores.nome_setor.
  const setorPorNome = new Map()
  for (const s of (setores || [])) {
    const chave = normalizaBusca(s.nome_setor)
    if (chave) setorPorNome.set(chave, s)
  }

  // Regra de negócio (não é "departamento padrão" genérico, é fixo): Tipo de OS em branco é
  // venda direta de balcão (não passa por Ordem de Serviço nenhuma) — sempre Balcão Peças /
  // Atacado-Varejo (único Setor hoje cadastrado sob Balcão Peças).
  const DEPTO_BALCAO_PECAS = 'af05c274-d017-4618-bb5f-87d46b589c36'
  const SETOR_ATACADO_VAREJO = 'cd487957-658d-4ca9-87fa-11fa294b3a53'

  // Une os grupos brutos (por tipo de OS, e por funcionário quando a Fonte tiver essa coluna
  // também) num bucket por departamento e outro por setor — vários grupos caindo no mesmo
  // departamento/setor se somam.
  const bucketsDepto = new Map()
  const bucketsSetor = new Map()
  const bucketTotal = novoBucket()
  const nomesSemDepartamento = new Set()
  for (const g of (res.grupos || [])) {
    somarNoBucket(bucketTotal, g)
    const tipoOsBruto = String(g.dims?.tipo_os ?? '').trim()
    const tipoOsResolvido = tipoOsBruto === '' ? null : resolverTipoOs(tipoOsBruto)
    const deptId = tipoOsBruto === '' ? DEPTO_BALCAO_PECAS : (tipoOsResolvido?.departamento_id || '__sem_departamento__')
    if (deptId === '__sem_departamento__') {
      const rotulo = g.dims?.funcionario || g.dims?.tipo_os || '(vazio)'
      nomesSemDepartamento.add(rotulo)
    }
    acumularBucket(bucketsDepto, deptId, g)

    const setorId = tipoOsBruto === '' ? SETOR_ATACADO_VAREJO : (setorPorNome.get(normalizaBusca(tipoOsResolvido?.setor_servico))?.id || null)
    if (setorId) acumularBucket(bucketsSetor, setorId, g)
  }

  const valorTotal = somaBucket(bucketTotal, medida.tipo_agregacao)
  const valoresPorDepartamento = new Map()
  for (const [deptId, b] of bucketsDepto) valoresPorDepartamento.set(deptId, somaBucket(b, medida.tipo_agregacao))
  const valoresPorSetor = new Map()
  for (const [setorId, b] of bucketsSetor) valoresPorSetor.set(setorId, somaBucket(b, medida.tipo_agregacao))

  return { valorTotal, valoresPorDepartamento, valoresPorSetor, nomesSemDepartamento }
}
