const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'

export const PER_PAGE = 25
// The API doesn't serve results past this rank for a single query, so a
// base whose filters match more than this can't be downloaded in full.
export const MAX_RESULTS = 50000
const MAX_MATCHING_ETABLISSEMENTS = 100
// The API allows at most 7 requests/second per IP; a small pause between our
// own sequential fetches keeps us well clear of that even on a fast network.
export const FETCH_PACING_MS = 200
const MAX_ATTEMPTS = 4

export const emptyFilters = () => ({
  departments: [],
  activites: [],
  sections: [],
  formesJuridiques: [],
  sizeGroups: [], // subset of 'ei' | 'tpe' | 'pme' | 'eti'
  tranchesEffectif: [] // exact Insee tranche_effectif_salarie codes
})

export function hasCriteria(filters) {
  return (
    filters.departments.length > 0 ||
    filters.activites.length > 0 ||
    filters.sections.length > 0 ||
    filters.formesJuridiques.length > 0 ||
    filters.sizeGroups.length > 0 ||
    filters.tranchesEffectif.length > 0
  )
}

// Simplified, business-friendly groupings layered on top of the raw INSEE
// filters: "entreprise individuelle" maps to a nature_juridique code, while
// TPE/PME/ETI map to the headcount bracket and/or INSEE's own size category
// (categorie_entreprise) since there is no single field that says "TPE".
const TPE_TRANCHES = ['NN', '00', '01', '02', '03']
const PME_TRANCHES = ['11', '12', '21', '22', '31', '32']

// Several groups can be checked at once, but within one API call every
// param is AND-ed together (only values inside the same param are OR-ed).
// tranche_effectif_salarie and categorie_entreprise can't both restrict the
// result when ETI is combined with TPE/PME, or genuine ETI-sized companies
// (250+ salariés) would be excluded by the smaller headcount bracket. In
// that case the headcount bracket is dropped and catégorie_entreprise=PME
// is used instead as Insee's own (broader, but accurate) stand-in for
// "TPE or PME", since micro/TPE-sized businesses are always counted as PME
// in Insee's official categorisation.
function buildSizeGroupParams(groups) {
  const set = new Set(groups)
  const natureJuridique = new Set()
  const trancheCodes = new Set()
  const categorieCodes = new Set()

  if (set.has('ei')) natureJuridique.add('1000')

  if (set.has('eti')) {
    categorieCodes.add('ETI')
    if (set.has('pme') || set.has('tpe')) categorieCodes.add('PME')
  } else {
    if (set.has('tpe')) TPE_TRANCHES.forEach(c => trancheCodes.add(c))
    if (set.has('pme')) {
      PME_TRANCHES.forEach(c => trancheCodes.add(c))
      categorieCodes.add('PME')
    }
  }

  return { natureJuridique, trancheCodes, categorieCodes }
}

export function buildParams(filters, page) {
  const params = new URLSearchParams()
  if (filters.departments.length) params.set('departement', filters.departments.join(','))
  if (filters.activites.length) params.set('activite_principale', filters.activites.join(','))
  if (filters.sections.length) params.set('section_activite_principale', filters.sections.join(','))

  const { natureJuridique: sizeNature, trancheCodes, categorieCodes } = buildSizeGroupParams(filters.sizeGroups)
  const natureJuridique = new Set([...filters.formesJuridiques, ...sizeNature])
  if (natureJuridique.size) params.set('nature_juridique', [...natureJuridique].join(','))
  // Explicitly picked tranches are more precise than the TPE/PME headcount
  // bracket, so they replace it (the categorie/forme juridique parts of the
  // size groups still apply).
  const tranches = filters.tranchesEffectif.length ? filters.tranchesEffectif : [...trancheCodes]
  if (tranches.length) params.set('tranche_effectif_salarie', tranches.join(','))
  if (categorieCodes.size) params.set('categorie_entreprise', [...categorieCodes].join(','))

  params.set('page', String(page))
  params.set('per_page', String(PER_PAGE))
  params.set('limite_matching_etablissements', String(MAX_MATCHING_ETABLISSEMENTS))
  return params
}

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

export const isAbort = e => e?.name === 'AbortError'

// Fetches one page. Transient problems (rate limiting, dropped connection) are
// retried a few times so a long download doesn't die on a single hiccup.
export async function fetchPage(filters, page, { signal } = {}) {
  const url = `${API_BASE}?${buildParams(filters, page)}`
  for (let attempt = 1; ; attempt++) {
    let res
    try {
      res = await fetch(url, { signal })
    } catch (e) {
      if (isAbort(e)) throw e
      if (attempt >= MAX_ATTEMPTS) {
        throw new Error("Impossible de contacter l'API (connexion interrompue). Réessayez dans quelques instants.")
      }
      await sleep(1000 * attempt, signal)
      continue
    }

    if (res.ok) return res.json()

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get('Retry-After'))
      await sleep((retryAfter > 0 ? retryAfter : attempt) * 1000, signal)
      continue
    }
    if (res.status === 429) {
      throw new Error("Trop de requêtes envoyées à l'API, réessayez dans quelques instants.")
    }
    const body = await res.json().catch(() => null)
    throw new Error(body?.erreur || `Erreur ${res.status} lors de l'appel à l'API`)
  }
}
