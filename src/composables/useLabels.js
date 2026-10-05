import { reactive } from 'vue'
import { DEPARTMENTS } from '../data/departments'
import { SECTIONS } from '../data/sections'

const labels = reactive({ naf: {}, forme: {}, tranche: {} })
let loadStarted = false

async function loadLabels(fileName) {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${fileName}`)
    const list = await res.json()
    return Object.fromEntries(list.map(a => [a.id, a.label]))
  } catch {
    return {}
  }
}

const departementNames = Object.fromEntries(DEPARTMENTS.map(d => [d.code, d.name]))
const sectionNames = Object.fromEntries(SECTIONS.map(s => [s.code, s.label]))
const CATEGORIES = { PME: 'PME', ETI: 'ETI', GE: 'Grande entreprise' }

const withCode = (code, label) => (label ? `${code} - ${label}` : code)

export function useLabels() {
  if (!loadStarted) {
    loadStarted = true
    loadLabels('naf-codes.json').then(l => { labels.naf = l })
    loadLabels('legal-forms.json').then(l => { labels.forme = l })
    loadLabels('tranche-effectif.json').then(l => { labels.tranche = l })
  }

  return {
    activityLabel: code => (code ? withCode(code, labels.naf[code]) : '-'),
    legalFormLabel: code => (code ? withCode(code, labels.forme[code]) : '-'),
    trancheEffectifLabel: code => (code ? labels.tranche[code] || code : '-'),
    departementLabel: code => withCode(code, departementNames[code]),
    sectionLabel: code => withCode(code, sectionNames[code]),
    categorieLabel: code => CATEGORIES[code] || code
  }
}
