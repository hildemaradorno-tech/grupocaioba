// Helpers do motor de BI (Medidas/Fontes) — usados pelo Slot no Faturamento em
// BI — Possibilidades pra calcular o valor de uma Medida (Total e cortado por
// Departamento/Setor) a partir dos grupos por Tipo de OS gravados no Supabase.

// Remove acentos além de trim/uppercase — nomes de funcionário costumam divergir só na
// acentuação entre o relatório do SharePoint e o cadastro (ex: "MENDONÇA" vs "MENDONCA").
export const normalizaBusca = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

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

// Mesmo corte de resolverPorDepartamento, mas pelo FUNCIONÁRIO da linha (modo "Produtivo" da aba
// Oficina): o departamento/setor vem do cadastro do funcionário (dim_funcionarios.setor_ids /
// departamento_ids), não do Tipo de OS. Casa o nome do relatório com o cadastro por nome normalizado
// (ou pelo Código Sistema BI). Sem setor no cadastro, usa só o departamento; sem nenhum dos dois (ou
// funcionário não encontrado) cai em '__sem_departamento__'.
// deptSemCadastro: departamento pra quem não casar com o cadastro (ex.: ROF042 é todo da Oficina —
// "Produtivo Não Associado" é serviço de oficina sem mecânico informado).
// Quem não casa com o cadastro (ex.: "Produtivo Não Associado") usa o setor do Tipo de OS da linha
// (tiposOS; o ROF042 grava "I21 - I21 - FUNILARIA...", a sigla é o 1º trecho) e, sem isso, deptSemCadastro.
export function resolverPorFuncionario(grupos, medida, { funcionarios, setores, deptSemCadastro = null, tiposOS = [] }) {
  const porNome = new Map()
  const porCodigo = new Map()
  for (const f of (funcionarios || [])) {
    const chave = normalizaBusca(f.nome_funcionario)
    // Mesmo nome repetido (ex.: readmissão): prefere quem não foi demitido.
    if (chave && (!porNome.has(chave) || (porNome.get(chave).data_demissao && !f.data_demissao))) porNome.set(chave, f)
    if (f.codigo_sistema_bi) porCodigo.set(String(f.codigo_sistema_bi).trim(), f)
  }
  const setorPorId = new Map((setores || []).map(s => [s.id, s]))
  const lista = (v) => (Array.isArray(v) ? v : [])
  const tipoPorSigla = new Map((tiposOS || []).filter(t => t.sigla).map(t => [normalizaBusca(t.sigla), t]))
  const setorPorNome = new Map((setores || []).map(s => [normalizaBusca(s.nome_setor), s]))
  const setorDoTipoOs = (bruto) => {
    const sigla = normalizaBusca(String(bruto ?? '').split(' - ')[0])
    const tipo = sigla ? tipoPorSigla.get(sigla) : null
    return tipo ? (setorPorNome.get(normalizaBusca(tipo.setor_servico))?.id || null) : null
  }

  const bucketsDepto = new Map()
  const bucketsSetor = new Map()
  const bucketsSetorFunc = new Map()
  const nomeFunc = new Map()
  const bucketsSetorBox = new Map()
  const nomeBox = new Map()
  const boxFunc = new Map()
  const bucketTotal = novoBucket()
  const nomesSemDepartamento = new Set()
  for (const g of (grupos || [])) {
    somarNoBucket(bucketTotal, g)
    const func = String(g.dims?.funcionario ?? '').trim()
    const cad = porNome.get(normalizaBusca(func)) || porCodigo.get(func) || null
    const setorId = lista(cad?.setor_ids)[0] || (!cad ? setorDoTipoOs(g.dims?.tipo_os) : null) || null
    const deptId = (setorId && setorPorId.get(setorId)?.departamento_id) || lista(cad?.departamento_ids)[0] || (!cad && deptSemCadastro) || '__sem_departamento__'
    if (deptId === '__sem_departamento__') nomesSemDepartamento.add(func || '(sem funcionário)')
    acumularBucket(bucketsDepto, deptId, g)
    if (setorId) {
      acumularBucket(bucketsSetor, setorId, g)
      // Box do cadastro do funcionário (dim_funcionarios.box_nome); sem box = "(Sem box)".
      const box = String(cad?.box_nome || '').trim() || '(Sem box)'
      const chaveBox = `${setorId}|${normalizaBusca(box)}`
      acumularBucket(bucketsSetorBox, chaveBox, g)
      if (!nomeBox.has(chaveBox)) nomeBox.set(chaveBox, box)
      if (func) {
        const chave = `${setorId}|${normalizaBusca(func)}`
        acumularBucket(bucketsSetorFunc, chave, g)
        if (!nomeFunc.has(chave)) nomeFunc.set(chave, cad?.nome_funcionario || func)
        if (!boxFunc.has(chave)) boxFunc.set(chave, box)
      }
    }
  }

  const valorTotal = somaBucket(bucketTotal, medida.tipo_agregacao)
  const valoresPorDepartamento = new Map()
  for (const [deptId, b] of bucketsDepto) valoresPorDepartamento.set(deptId, somaBucket(b, medida.tipo_agregacao))
  const valoresPorSetor = new Map()
  for (const [setorId, b] of bucketsSetor) valoresPorSetor.set(setorId, somaBucket(b, medida.tipo_agregacao))
  const valoresPorSetorFuncionario = new Map()
  for (const [chave, b] of bucketsSetorFunc) {
    valoresPorSetorFuncionario.set(chave, { setorId: chave.split('|')[0], nome: nomeFunc.get(chave), box: boxFunc.get(chave), valor: somaBucket(b, medida.tipo_agregacao) })
  }
  const valoresPorSetorBox = new Map() // 'setorId|BOX' -> { setorId, nome, valor }
  for (const [chave, b] of bucketsSetorBox) {
    valoresPorSetorBox.set(chave, { setorId: chave.split('|')[0], nome: nomeBox.get(chave), valor: somaBucket(b, medida.tipo_agregacao) })
  }
  return { valorTotal, valoresPorDepartamento, valoresPorSetor, valoresPorSetorFuncionario, valoresPorSetorBox, nomesSemDepartamento }
}

// Resolve o valor de uma Medida CORTADO por Departamento E por Setor a partir dos grupos já
// agregados por Tipo de OS ({ dims: { tipo_os }, soma, linhas, distintos }) — hoje vindos de
// fato_bi_medidas_diario (função bi_medidas_agregado). Resolve SÓ via Tipo de OS da linha
// (dim_tipos_os.departamento_id + setor_servico→dim_setores.nome_setor), não por Funcionário: um
// mesmo funcionário pode faturar em mais de um departamento (ex: Balcão e Oficina), então o
// departamento/setor tem que vir da transação. O Total é somado direto dos grupos brutos (união
// dos distintos na Contagem Distinta), não da soma dos departamentos. Retorna { valorTotal,
// valoresPorDepartamento: Map<departamentoId | '__sem_departamento__', valor>, valoresPorSetor:
// Map<setorId, valor>, nomesSemDepartamento: Set<string> } — nomesSemDepartamento só pra
// diagnóstico: os Tipos de OS que caíram em "Sem Departamento" (não cadastrados com Departamento
// em Tipos de O.S. — Tipo de OS em BRANCO não cai aqui, é sempre Balcão Peças/Atacado Varejo,
// venda direta sem Ordem de Serviço).
export function resolverPorDepartamento(grupos, medida, { tiposOS, setores }) {
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
  // Por Setor × Funcionário (nome normalizado) — vendedores abaixo do setor na aba Balcão.
  const bucketsSetorFunc = new Map()
  const nomeFunc = new Map()
  // Por Setor × Tipo de OS (sigla normalizada) — aba Serviços, modo Consultor › Por Tipo de OS.
  const bucketsSetorTipo = new Map()
  const nomeTipo = new Map()
  const bucketTotal = novoBucket()
  const nomesSemDepartamento = new Set()
  for (const g of (grupos || [])) {
    somarNoBucket(bucketTotal, g)
    const tipoOsBruto = String(g.dims?.tipo_os ?? '').trim()
    const tipoOsResolvido = tipoOsBruto === '' ? null : resolverTipoOs(tipoOsBruto)
    const deptId = tipoOsBruto === '' ? DEPTO_BALCAO_PECAS : (tipoOsResolvido?.departamento_id || '__sem_departamento__')
    if (deptId === '__sem_departamento__') {
      const rotulo = g.dims?.tipo_os || '(vazio)'
      nomesSemDepartamento.add(rotulo)
    }
    acumularBucket(bucketsDepto, deptId, g)

    const setorId = tipoOsBruto === '' ? SETOR_ATACADO_VAREJO : (setorPorNome.get(normalizaBusca(tipoOsResolvido?.setor_servico))?.id || null)
    if (setorId) {
      acumularBucket(bucketsSetor, setorId, g)
      if (tipoOsBruto) {
        const chaveTipo = `${setorId}|${normalizaBusca(tipoOsBruto)}`
        acumularBucket(bucketsSetorTipo, chaveTipo, g)
        if (!nomeTipo.has(chaveTipo)) nomeTipo.set(chaveTipo, tipoOsResolvido?.tipo_os || tipoOsBruto)
      }
      const func = String(g.dims?.funcionario ?? '').trim()
      if (func) {
        const chave = `${setorId}|${normalizaBusca(func)}`
        acumularBucket(bucketsSetorFunc, chave, g)
        if (!nomeFunc.has(chave)) nomeFunc.set(chave, func)
      }
    }
  }

  const valorTotal = somaBucket(bucketTotal, medida.tipo_agregacao)
  const valoresPorDepartamento = new Map()
  for (const [deptId, b] of bucketsDepto) valoresPorDepartamento.set(deptId, somaBucket(b, medida.tipo_agregacao))
  const valoresPorSetor = new Map()
  for (const [setorId, b] of bucketsSetor) valoresPorSetor.set(setorId, somaBucket(b, medida.tipo_agregacao))

  const valoresPorSetorFuncionario = new Map() // 'setorId|NOME NORMALIZADO' -> { setorId, nome, valor }
  for (const [chave, b] of bucketsSetorFunc) {
    valoresPorSetorFuncionario.set(chave, { setorId: chave.split('|')[0], nome: nomeFunc.get(chave), valor: somaBucket(b, medida.tipo_agregacao) })
  }

  const valoresPorSetorTipoOs = new Map() // 'setorId|SIGLA' -> { setorId, nome, valor }
  for (const [chave, b] of bucketsSetorTipo) {
    valoresPorSetorTipoOs.set(chave, { setorId: chave.split('|')[0], nome: nomeTipo.get(chave), valor: somaBucket(b, medida.tipo_agregacao) })
  }

  return { valorTotal, valoresPorDepartamento, valoresPorSetor, valoresPorSetorFuncionario, valoresPorSetorTipoOs, nomesSemDepartamento }
}
