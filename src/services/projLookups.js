export const projLookups = {
  departamentos: null,
  areas: null,
  sistemas: null,
  responsaveis: null,
  empresas: null,
  fases: null,
}

export function clearProjLookups(...keys) {
  const targets = keys.length ? keys : Object.keys(projLookups)
  targets.forEach(k => { projLookups[k] = null })
}
