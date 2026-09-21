import { valoresMetaMecanico, resolverPosicaoMecanico } from './metasMecanico'

// Mesmo critério da Gestão de Aprovação: mês com valor gravado é pendente se nunca foi aprovado ou mudou depois.
export const linhaPendente = (grav, aprovada) => {
  if (!grav) return false
  if (aprovada === null || aprovada === undefined) return true
  return Math.abs(grav - Number(aprovada)) > 0.001
}

// Unified tree: empresa → dept → setor → box → colaborador
// Nenhuma linha é descartada por box/setor que não existam mais no cadastro: cai no nome gravado.
export function buildUnifiedTree(allRows, deptMap, setorMap, boxMap, funcMap) {
  const tree = {}
  allRows.forEach(r => {
    const eId   = r.empresa_id || '—'
    const eNome = r.empresa_nome || eId
    const dId   = r.departamento_id || r.departamento_nome || '—'
    const sId   = r.setor_id   || r.setor_nome   || '—'
    const bId   = r.box_id     || r.box_nome     || '—'
    const coId  = r.colaborador_id || r.colaborador_nome || '—'

    const dNome  = deptMap[r.departamento_id]  || r.departamento_nome  || '—'
    const sNome  = setorMap[r.setor_id]         || r.setor_nome         || '—'
    const bNome  = boxMap[r.box_id]             || r.box_nome           || '—'
    const coNome = funcMap[r.colaborador_id]    || r.colaborador_nome   || '—'

    const val = Number(r.meta_faturamento) || 0

    if (!tree[eId]) tree[eId] = { nome: eNome, depts: {} }
    const emp = tree[eId]
    if (!emp.depts[dId]) emp.depts[dId] = { nome: dNome, setores: {} }
    const dept = emp.depts[dId]
    if (!dept.setores[sId]) dept.setores[sId] = { nome: sNome, boxes: {} }
    const setor = dept.setores[sId]
    if (!setor.boxes[bId]) setor.boxes[bId] = { nome: bNome, colabs: {} }
    const box = setor.boxes[bId]
    if (!box.colabs[coId]) box.colabs[coId] = { nome: coNome, meses: Array(12).fill(0), tem: false, pend: false, linhas: [] }
    const colab = box.colabs[coId]
    colab.meses[r.mes - 1] += val
    colab.linhas.push(r)
    const grav = Number(r._grav ?? r.meta_faturamento) || 0
    if (grav) {
      colab.tem = true
      if (linhaPendente(grav, r.meta_aprovada)) colab.pend = true
    }
  })
  return tree
}

export const aggColabs = (colabs) => { const a = Array(12).fill(0); Object.values(colabs).forEach(c => c.meses.forEach((v,i)=>{ a[i]+=v })); return a }
export const aggBox    = (box)    => aggColabs(box.colabs)
export const aggSetor  = (setor)  => { const a = Array(12).fill(0); Object.values(setor.boxes).forEach(b => aggBox(b).forEach((v,i)=>{a[i]+=v})); return a }
export const aggDept   = (dept)   => { const a = Array(12).fill(0); Object.values(dept.setores).forEach(s => aggSetor(s).forEach((v,i)=>{a[i]+=v})); return a }
export const aggEmp    = (emp)    => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDept(d).forEach((v,i)=>{a[i]+=v})); return a }

// O setor Consultores é só a distribuição de Mecânica + Funilaria (+ Terceiros) entre os consultores; somar
// junto com eles contaria tudo duas vezes. O total do departamento exclui Consultores (que continua
// aparecendo na árvore, para consulta).
export const ehConsultores = (s) => (s.nome || '').toLowerCase().includes('consultor')
export const aggDeptDedup = (dept) => {
  const a = Array(12).fill(0)
  Object.values(dept.setores).filter(s => !ehConsultores(s)).forEach(s => aggSetor(s).forEach((v,i) => { a[i] += v }))
  return a
}
export const aggEmpDedup = (emp) => { const a = Array(12).fill(0); Object.values(emp.depts).forEach(d => aggDeptDedup(d).forEach((v,i)=>{a[i]+=v})); return a }

// Monta a árvore unificada do Total Pós-Vendas: Peças + Consultor + Mecânico (inclui Produtivo Não Associado
// Funilaria) + Terceiros. Cada linha recebe um _tipo para a tela de cálculo do funcionário.
export function montarArvoreTotal({ rowsPecas, rowsMecanico, rowsConsultor, rowsTerceiros, funcionarios, cargos, boxes, setores, departamentos, filtroVisu = 'total' }) {
  const deptMap  = Object.fromEntries(departamentos.map(d => [d.id, d.nome_departamento]))
  const setorMap = Object.fromEntries(setores.map(s => [s.id, s.nome_setor]))
  const boxMap   = Object.fromEntries(boxes.map(b => [b.id, b.nome_box]))
  const funcMap  = Object.fromEntries(funcionarios.map(f => [f.id, f.nome_funcionario]))

  // Mecânico: mesma posição (departamento/setor/box/cargo pelo cadastro do funcionário) e mesmo cálculo da
  // aba Metas - Mecânico, para os valores baterem exatamente.
  const ctx = { funcionarios, cargos, boxes, setores, departamentos }
  const mec = rowsMecanico.map(r => {
    const p = resolverPosicaoMecanico(r, ctx)
    const { meta_servicos: ms, meta_pecas: mp } = valoresMetaMecanico(r)
    const val = filtroVisu === 'servicos' ? ms : filtroVisu === 'pecas' ? mp : ms + mp
    return { ...r, departamento_id: p.did, setor_id: p.sId, box_id: p.bId, cargo_id: p.cId, meta_faturamento: val, _grav: ms + mp, _tipo: 'MECANICO' }
  })

  // Consultor: as linhas ficam ligadas direto a Mecânica/Funilaria; aqui elas voltam ao setor "Consultores"
  // (distribuição), que aparece na árvore mas não entra no total (ver aggDeptDedup).
  const consultoriaSetor = setores.find(s => s.tipo_setor === 'consultoria') || null
  const cons = rowsConsultor.map(r => {
    if (!consultoriaSetor) return { ...r, _tipo: 'CONSULTOR' }
    const setorOrigem = setores.find(s => s.id === r.setor_id)?.nome_setor || r.setor_nome || '—'
    const boxAntigo = r.box_id ? boxes.find(b => b.id === r.box_id) : null
    return {
      ...r,
      departamento_id: consultoriaSetor.departamento_id || r.departamento_id,
      setor_id: consultoriaSetor.id, setor_nome: consultoriaSetor.nome_setor,
      box_id: boxAntigo?.id || `__cons__${r.setor_id || setorOrigem}`,
      box_nome: boxAntigo?.nome_box || setorOrigem,
      _setorOrigemId: r.setor_id, _setorOrigemNome: setorOrigem,
      _tipo: 'CONSULTOR',
    }
  })

  const setorPorNome = (trecho) => {
    const s = setores.find(x => (x.nome_setor || '').toLowerCase().includes(trecho))
    return s ? { id: s.id, nome: s.nome_setor, departamento_id: s.departamento_id } : null
  }
  const funSetorInfo = setorPorNome('funilaria')
  const terSetorInfo = setorPorNome('terceiro')
  let ter = []
  if (filtroVisu !== 'pecas') {
    const sId   = terSetorInfo?.id   || '__terceiros__'
    const sNome = terSetorInfo?.nome || 'Terceiros'
    const dId   = terSetorInfo?.departamento_id || funSetorInfo?.departamento_id || '—'
    const dNome = deptMap[dId] || '—'
    ter = rowsTerceiros.flatMap(r => {
      const val = Number(r.meta_servicos) || 0
      if (val === 0) return []
      return [{
        empresa_id: r.empresa_id, empresa_nome: r.empresa_nome,
        departamento_id: dId, departamento_nome: dNome,
        setor_id: sId, setor_nome: sNome,
        box_id: '__terceiros__', box_nome: 'Terceiros',
        cargo_id: '__terceiros__', cargo_nome: 'Terceiros',
        colaborador_id: `__ter__${r.empresa_id}__${r.mes}`, colaborador_nome: r.empresa_nome || 'Meta Terceiros',
        mes: r.mes, meta_faturamento: val, meta_servicos: val,
        _grav: Number(r.meta_faturamento) || val,
        meta_aprovada: r.meta_aprovada,
        _tipo: 'TERCEIROS',
      }]
    })
  }

  return buildUnifiedTree(
    [...rowsPecas.map(r => ({ ...r, _tipo: 'PECAS' })), ...cons, ...mec, ...ter],
    deptMap, setorMap, boxMap, funcMap
  )
}
