import { ref, computed, watch, onScopeDispose } from 'vue'
import { fetchPage, hasCriteria, isAbort, MAX_RESULTS } from '../api/rechercheEntreprises'

const DEBOUNCE_MS = 600

// The API caps `total_results` at MAX_RESULTS, so a reported total of exactly
// that means "that many or more": it can't be trusted as complete.

// Remote count + first page of results for the filters being edited. Waits
// for the user to stop touching filters, and cancels whatever request is
// still in flight when they change again.
export function useBasePreview(filters) {
  const total = ref(null)
  const results = ref([])
  const loading = ref(false)
  const error = ref(null)

  let timer = null
  let controller = null

  const tooMany = computed(() => total.value !== null && total.value >= MAX_RESULTS)

  function reset() {
    total.value = null
    results.value = []
    loading.value = false
    error.value = null
  }

  async function run() {
    const mine = new AbortController()
    controller = mine
    try {
      const data = await fetchPage(filters, 1, { signal: mine.signal })
      total.value = data.total_results || 0
      results.value = data.results || []
      error.value = null
    } catch (e) {
      if (isAbort(e)) return
      total.value = null
      results.value = []
      error.value = e.message || "Erreur lors de l'interrogation de l'API."
    } finally {
      if (controller === mine) loading.value = false
    }
  }

  watch(
    () => JSON.stringify(filters),
    () => {
      clearTimeout(timer)
      controller?.abort()
      if (!hasCriteria(filters)) {
        reset()
        return
      }
      loading.value = true
      error.value = null
      timer = setTimeout(run, DEBOUNCE_MS)
    },
    { immediate: true }
  )

  onScopeDispose(() => {
    clearTimeout(timer)
    controller?.abort()
  })

  return { total, results, loading, error, tooMany }
}
