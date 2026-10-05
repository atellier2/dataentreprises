import { ref } from 'vue'
import { fetchPage, isAbort, sleep, FETCH_PACING_MS, MAX_RESULTS } from '../api/rechercheEntreprises'
import { addCompaniesToBase, pruneBase } from '../db/prospectionDb'
import { useBases } from './useBases'

// Downloads every fiche matching a base's filters. Always starts from page 1:
// "update" and "first download" are the same operation. Fiches that no longer
// match are only unlinked at the very end of a complete run, so a cancelled
// or failed update never loses data.
export function useBaseDownload() {
  const { saveBase, refreshCount } = useBases()

  const running = ref(false)
  const downloaded = ref(0)
  const total = ref(null)
  const error = ref(null)

  let controller = null

  // Resolves true when the base was fully downloaded.
  async function start(base) {
    controller = new AbortController()
    const { signal } = controller
    running.value = true
    downloaded.value = 0
    total.value = null
    error.value = null

    base.status = 'downloading'
    base.error = null
    await saveBase(base)

    const seen = new Set()
    const excluded = new Set(base.excluded)
    let completed = false
    try {
      for (let page = 1; ; page++) {
        const data = await fetchPage(base.filters, page, { signal })
        if (page === 1) {
          total.value = data.total_results || 0
          // total_results is capped by the API at MAX_RESULTS, so reaching it
          // means the real total may be larger than what can be downloaded.
          if (total.value >= MAX_RESULTS) {
            throw new Error(
              `${MAX_RESULTS} fiches ou plus correspondent : l'API n'en permet que ${MAX_RESULTS} par recherche. Affinez les filtres.`
            )
          }
        }
        const companies = data.results || []
        const kept = companies.filter(c => !excluded.has(c.siren))
        await addCompaniesToBase(base.id, kept)
        kept.forEach(c => seen.add(c.siren))
        // Counts every fiche received (deleted ones included) so progress
        // still reaches the API's total.
        downloaded.value += companies.length

        if (companies.length === 0 || page >= (data.total_pages || 1)) break
        await sleep(FETCH_PACING_MS, signal)
      }
      await pruneBase(base.id, seen)
      base.status = 'ready'
      base.remoteTotal = total.value
      base.downloadedAt = Date.now()
      completed = true
    } catch (e) {
      base.status = 'partial'
      if (!isAbort(e)) {
        error.value = e.message || 'Erreur pendant le téléchargement.'
        base.error = error.value
      }
    } finally {
      running.value = false
      await saveBase(base)
      await refreshCount(base.id)
    }
    return completed
  }

  function cancel() {
    controller?.abort()
  }

  return { running, downloaded, total, error, start, cancel }
}
