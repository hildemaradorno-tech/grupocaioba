export const DIMENSOES_COMISSAO = ['empresa', 'setor']

// Escopo "sem nenhuma restrição" — usado como padrão pra admin (real ou impersonando).
export function escopoComissaoTudoLiberado() {
  return Object.fromEntries(DIMENSOES_COMISSAO.map(dim => [dim, { modo: 'TODOS', valores: new Set() }]))
}

// Escopo "nada liberado" — usado quando o grupo não tem a trava mestre
// (comissao_escopo_habilitado) ligada: a tela abre, mas nenhum funcionário aparece até
// alguém habilitar e configurar manualmente em Grupos de Acesso.
export function escopoComissaoTudoBloqueado() {
  return Object.fromEntries(DIMENSOES_COMISSAO.map(dim => [dim, { modo: 'INDIVIDUAL', valores: new Set() }]))
}

const DIMENSOES_MULTI = new Set(['setor'])
const CAMPO_CANDIDATO = {
  empresa: 'empresaId',
  setor: 'setorIds',
}

// candidato: { empresaId, setorIds:[] }
// escopo: comissaoEscopoEfetivo — empresa (controlada pelo acesso geral) + setor.
// Cada dimensão em modo INDIVIDUAL precisa passar; TODOS (ou dimensão ausente) nunca bloqueia.
// Dimensões multi-valor (área/departamento/setor) passam com qualquer sobreposição; um
// candidato sem nenhum valor cadastrado numa dimensão em modo INDIVIDUAL é reprovado
// (fail-closed) — não dá pra provar que ele pertence ao que foi liberado.
export function passaEscopoComissao(candidato, escopo) {
  if (!escopo) return true
  for (const dim of DIMENSOES_COMISSAO) {
    const cfg = escopo[dim]
    if (!cfg || cfg.modo !== 'INDIVIDUAL') continue
    const valorCandidato = candidato[CAMPO_CANDIDATO[dim]]
    if (DIMENSOES_MULTI.has(dim)) {
      const arr = valorCandidato || []
      if (arr.length === 0 || !arr.some(v => cfg.valores.has(v))) return false
    } else {
      if (valorCandidato == null || !cfg.valores.has(valorCandidato)) return false
    }
  }
  return true
}

// nivelPorSetor: Map<setor_id, 'editar'|'visualizar'> (comissaoNivelSetorEfetivo do
// AuthContext) — ausência de entrada = 'editar' (sem restrição extra), mesmo padrão de
// "dimensão ausente nunca bloqueia" usado acima. Setor nulo (nada selecionado/aplicável)
// também nunca bloqueia.
export function setorSoVisualizacao(setorId, nivelPorSetor) {
  if (!setorId || !nivelPorSetor) return false
  return nivelPorSetor.get(setorId) === 'visualizar'
}
