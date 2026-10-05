import { ref, shallowRef, reactive, computed, watch } from 'vue'
import { getCompaniesOfBase, getAllAnnotations, patchAnnotation, patchAnnotations, removeCompaniesFromBase } from '../db/prospectionDb'
import { normalizeEmoji } from '../utils/emoji'
import { useBases } from './useBases'

// Facet value standing for "fiche without emoji".
export const NO_EMOJI = '__none__'

const FACET_KEYS = ['departements', 'sections', 'activites', 'formes', 'tranches', 'categories', 'emojis']

// Value of each facet on a company (`o` = the options from toOptions).
// `departements` is special: a company can span several, through its
// établissements (see passes / facets below).
const FIELD = {
  sections: c => c.section_activite_principale,
  activites: c => c.activite_principale,
  formes: c => c.nature_juridique,
  tranches: c => c.tranche_effectif_salarie,
  categories: c => c.categorie_entreprise,
  emojis: (c, o) => o.emojiMap[c.siren] || NO_EMOJI
}

const defaultFilters = () => ({
  departements: [],
  sections: [],
  activites: [],
  formes: [],
  tranches: [],
  categories: [],
  emojis: [],
  scope: 'both', // 'siege' | 'etablissement' | 'both'
  includeClosed: false,
  search: ''
})

// `matching_etablissements` entries don't carry a `departement` field of
// their own (only the `siege` fallback shape does) - it has to be derived
// from the INSEE commune code, whose first two digits are the department
// (three for the 97x/98x overseas ones), same convention as `siege.departement`.
function departementOf(etablissement) {
  if (etablissement.departement) return etablissement.departement
  const commune = etablissement.commune || ''
  return /^(97|98)/.test(commune) ? commune.slice(0, 3) : commune.slice(0, 2)
}

function toEntry(company) {
  const matches = company.matching_etablissements || []
  const list = matches.length ? matches : [{ ...(company.siege || {}), est_siege: true }]
  const establishments = list.map(e => ({ ...e, departement: departementOf(e) }))
  const haystack = [
    company.nom_complet,
    company.nom_raison_sociale,
    company.siren,
    ...establishments.map(e => e.libelle_commune)
  ].filter(Boolean).join(' ').toLowerCase()
  return { company, establishments, haystack }
}

// Selected values as Sets, computed once per recomputation.
function toOptions(f, emojiMap) {
  const options = { scope: f.scope, includeClosed: f.includeClosed, search: f.search.trim().toLowerCase(), emojiMap }
  for (const key of FACET_KEYS) options[key] = new Set(f[key])
  return options
}

function visibleEstablishments(entry, o, ignoreDepartements) {
  return entry.establishments.filter(e => {
    if (!o.includeClosed && e.etat_administratif === 'F') return false
    if (!ignoreDepartements && o.departements.size && !o.departements.has(e.departement)) return false
    if (o.scope === 'siege' && !e.est_siege) return false
    if (o.scope === 'etablissement' && e.est_siege) return false
    return true
  })
}

// `skip` leaves one facet's own selection out, which is what lets a facet
// keep showing the other values it could switch to, with their counts.
function passes(entry, o, skip) {
  if (o.search && !entry.haystack.includes(o.search)) return false
  for (const key of Object.keys(FIELD)) {
    if (key !== skip && o[key].size && !o[key].has(FIELD[key](entry.company, o))) return false
  }
  return visibleEstablishments(entry, o, skip === 'departements').length > 0
}

function rankFacet(counts, selected) {
  for (const value of selected) if (!counts.has(value)) counts.set(value, 0)
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
}

export function useConsultation(base) {
  const { saveBase } = useBases()

  const entries = shallowRef([])
  const notes = ref({})
  const emojis = ref({})
  const loading = ref(true)
  const filters = reactive({ ...defaultFilters(), ...(base.localFilters || {}) })

  async function load() {
    loading.value = true
    try {
      const [companies, annotations] = await Promise.all([getCompaniesOfBase(base.id), getAllAnnotations()])
      const list = companies.map(toEntry)
      list.sort((a, b) => (a.company.nom_complet || '').localeCompare(b.company.nom_complet || ''))
      entries.value = list
      notes.value = annotations.notes
      emojis.value = annotations.emojis
    } finally {
      loading.value = false
    }
  }

  const rows = computed(() => {
    // Only depend on the emojis when filtering by them: otherwise tagging a
    // fiche would rebuild the list and send the table back to its first rows.
    const o = toOptions(filters, filters.emojis.length ? emojis.value : {})
    const out = []
    for (const entry of entries.value) {
      if (passes(entry, o, null)) out.push({ company: entry.company, establishments: visibleEstablishments(entry, o, false) })
    }
    return out
  })

  const facets = computed(() => {
    const o = toOptions(filters, emojis.value)
    const result = {}
    for (const key of FACET_KEYS) {
      const counts = new Map()
      for (const entry of entries.value) {
        if (!passes(entry, o, key)) continue
        const values = key === 'departements'
          ? new Set(visibleEstablishments(entry, o, true).map(e => e.departement))
          : [FIELD[key](entry.company, o)]
        for (const value of values) {
          if (value) counts.set(value, (counts.get(value) || 0) + 1)
        }
      }
      result[key] = rankFacet(counts, filters[key])
    }
    return result
  })

  function resetFilters() {
    Object.assign(filters, defaultFilters())
  }

  function updateNote(siren, text) {
    const value = text.trim()
    if (value) notes.value = { ...notes.value, [siren]: value }
    else {
      const { [siren]: _removed, ...rest } = notes.value
      notes.value = rest
    }
    patchAnnotation(siren, { text: value }).catch(() => {})
  }

  // `emoji` is cut down to its first emoji; '' removes it.
  function updateEmojis(sirens, emoji) {
    const value = normalizeEmoji(emoji)
    const next = { ...emojis.value }
    for (const siren of sirens) {
      if (value) next[siren] = value
      else delete next[siren]
    }
    emojis.value = next
    patchAnnotations(sirens, { emoji: value }).catch(() => {})
  }

  const updateEmoji = (siren, emoji) => updateEmojis([siren], emoji)

  // Removes fiches from this base only (notes stay) and remembers them so a
  // later update doesn't download them again.
  async function removeCompanies(sirens) {
    if (!sirens.length) return
    await removeCompaniesFromBase(base.id, sirens)
    const gone = new Set(sirens)
    entries.value = entries.value.filter(e => !gone.has(e.company.siren))
    base.excluded = [...new Set([...base.excluded, ...sirens])]
    await saveBase(base)
  }

  let saveTimer = null
  watch(filters, () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      base.localFilters = JSON.parse(JSON.stringify(filters))
      saveBase(base).catch(() => {})
    }, 400)
  }, { deep: true })

  load()

  return { filters, loading, totalLocal: computed(() => entries.value.length), rows, facets, notes, emojis, updateNote, updateEmoji, updateEmojis, removeCompanies, resetFilters, reload: load }
}
