import { ref } from 'vue'
import { listBases, putBase, deleteBase, countCompaniesOfBase } from '../db/prospectionDb'
import { emptyFilters } from '../api/rechercheEntreprises'

// Module-level state: one list of bases shared by every component.
const bases = ref([])
const localCounts = ref({})
const loaded = ref(false)

async function refreshCount(id) {
  try {
    localCounts.value = { ...localCounts.value, [id]: await countCompaniesOfBase(id) }
  } catch {
    // Count is informational only.
  }
}

async function loadBases() {
  const list = await listBases()
  for (const base of list) {
    // Bases saved before a filter existed get its empty default.
    base.filters = { ...emptyFilters(), ...base.filters }
    base.excluded = base.excluded || []
    // A download can't survive a page reload: whatever was in flight is now
    // an incomplete base.
    if (base.status === 'downloading') {
      base.status = 'partial'
      await putBase(base)
    }
  }
  list.sort((a, b) => b.createdAt - a.createdAt)
  bases.value = list
  await Promise.all(list.map(b => refreshCount(b.id)))
  loaded.value = true
}

async function createBase(name) {
  const base = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    filters: emptyFilters(),
    localFilters: null,
    // Sirens deleted by hand: kept out of every later download, otherwise an
    // update would bring them straight back from the API.
    excluded: [],
    status: 'draft', // 'draft' | 'downloading' | 'ready' | 'partial'
    remoteTotal: null,
    createdAt: Date.now(),
    downloadedAt: null,
    error: null
  }
  await putBase(base)
  bases.value = [base, ...bases.value]
  localCounts.value = { ...localCounts.value, [base.id]: 0 }
  // Return the reactive version so later mutations are tracked.
  return bases.value[0]
}

function saveBase(base) {
  return putBase(base)
}

async function removeBase(id) {
  await deleteBase(id)
  bases.value = bases.value.filter(b => b.id !== id)
}

export function useBases() {
  return { bases, localCounts, loaded, loadBases, createBase, saveBase, removeBase, refreshCount }
}
