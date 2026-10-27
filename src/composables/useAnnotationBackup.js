import { exportAnnotations, importAnnotations } from '../db/prospectionDb'
import { normalizeEmoji } from '../utils/emoji'

const FILE_TYPE = 'prospection-annotations'
const FILE_VERSION = 1

// Backs up the personal data only (notes and emojis, keyed by siren); the
// fiches themselves can be downloaded again from the API.
export function useAnnotationBackup() {
  // Resolves with the number of annotated fiches saved to the file.
  async function exportToFile() {
    const annotations = (await exportAnnotations()).filter(a => a.text || a.emoji)
    const payload = { type: FILE_TYPE, version: FILE_VERSION, exportedAt: new Date().toISOString(), annotations }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prospection-notes-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    return annotations.length
  }

  // Resolves with the number of annotated fiches restored. Throws an Error
  // with a user-facing message if the file isn't a valid backup.
  async function importFromFile(file) {
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      throw new Error("Ce fichier n'est pas un JSON valide.")
    }
    if (data?.type !== FILE_TYPE || !Array.isArray(data.annotations)) {
      throw new Error("Ce fichier n'est pas une sauvegarde de notes Prospection.")
    }
    if (data.version > FILE_VERSION) {
      throw new Error('Cette sauvegarde vient d\'une version plus récente de l\'application.')
    }
    const records = []
    for (const a of data.annotations) {
      if (typeof a?.siren !== 'string' || !a.siren) continue
      const text = typeof a.text === 'string' ? a.text.trim() : ''
      const emoji = normalizeEmoji(a.emoji)
      if (text || emoji) records.push({ siren: a.siren, text, emoji })
    }
    if (!records.length) throw new Error('Aucune note ni aucun emoji dans ce fichier.')
    await importAnnotations(records)
    return records.length
  }

  return { exportToFile, importFromFile }
}
