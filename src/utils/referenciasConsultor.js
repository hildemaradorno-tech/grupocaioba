import { valoresMetaMecanico } from './metasMecanico'

// Referência do setor por mês para a distribuição do consultor — mesma regra da aba Metas - Consultor:
// Funilaria/Pintura usa as metas de Funilaria; Mecânica soma os mecânicos dos boxes do setor + Terceiros
// (outros setores, como Lavagem/Elétrica, não recebem Terceiros). Terceiros são lançados na aba Mecânico
// com Setor "Terceiro" (sem Box — ex.: "Produtivo Não Associado") e só entram quando o setor selecionado
// for especificamente Mecânica (padrão fixo — se um dia precisar de Terceiro na Funilaria, ele entra por
// Box). Devolve 12 posições { pecas, servicos, terceiros }.
export function referenciasConsultor(empresaId, setorId, setorNome, { rowsMecanico, rowsFunilaria, funcionarios, boxes, setores }) {
  const refs = Array.from({ length: 12 }, () => ({ pecas: 0, servicos: 0, terceiros: 0 }))
  if (/funilaria|pintura/i.test(setorNome || '')) {
    rowsFunilaria.filter(r => r.empresa_id === empresaId).forEach(r => {
      refs[r.mes - 1].pecas += Number(r.meta_pecas) || 0
      refs[r.mes - 1].servicos += Number(r.meta_servicos) || 0
    })
    return refs
  }
  const ehMecanica = /mec[âa]nica/i.test(setorNome || '')
  const boxParaSetor = {}
  boxes.forEach(b => {
    const ids = Array.isArray(b.setor_ids) ? b.setor_ids : (b.setor_id ? [b.setor_id] : [])
    const valido = ids.find(id => setores.some(s => s.id === id))
    if (valido) boxParaSetor[b.id] = valido
  })
  const setorNomeMap = Object.fromEntries(setores.map(s => [s.id, s.nome_setor]))
  rowsMecanico.filter(r => r.empresa_id === empresaId).forEach(r => {
    const bId = funcionarios.find(f => f.id === r.colaborador_id)?.box_id || r.box_id
    const v = valoresMetaMecanico(r)
    if (bId && boxParaSetor[bId] === setorId) {
      refs[r.mes - 1].servicos += v.meta_servicos
      refs[r.mes - 1].pecas += v.meta_pecas
      return
    }
    // Terceiro (sem Box própria): entra só quando este setor for Mecânica.
    const sNome = (!bId ? setorNomeMap[r.setor_id] : null) || r.setor_nome || ''
    if (!bId && ehMecanica && /terceiro/i.test(sNome)) refs[r.mes - 1].terceiros += v.meta_servicos + v.meta_pecas
  })
  return refs
}

// Setor de origem de uma linha de consultor: linha antiga presa a um box reroteia para o setor atual do box.
export function setorOrigemConsultor(linha, { boxes, setores }) {
  const boxParaSetor = {}
  boxes.forEach(b => {
    const ids = Array.isArray(b.setor_ids) ? b.setor_ids : (b.setor_id ? [b.setor_id] : [])
    const valido = ids.find(id => setores.some(s => s.id === id))
    if (valido) boxParaSetor[b.id] = valido
  })
  const id = (linha.box_id && boxParaSetor[linha.box_id]) || linha.setor_id
  return { id, nome: setores.find(s => s.id === id)?.nome_setor || linha.setor_nome || '' }
}
