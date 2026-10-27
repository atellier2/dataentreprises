<script setup>
import { ref } from 'vue'
import { useBases } from '../composables/useBases'
import { useAnnotationBackup } from '../composables/useAnnotationBackup'

const emit = defineEmits(['open'])

const { bases, localCounts, createBase, removeBase } = useBases()

const newName = ref('')

const STATUS_LABELS = {
  draft: 'Brouillon',
  downloading: 'Téléchargement...',
  ready: 'Téléchargée',
  partial: 'Incomplète'
}

async function create() {
  if (!newName.value.trim()) return
  const base = await createBase(newName.value)
  newName.value = ''
  emit('open', base.id)
}

async function remove(base) {
  if (!confirm(`Supprimer la base « ${base.name} » ? Les notes sont conservées.`)) return
  await removeBase(base.id)
}

const formatDate = ts => (ts ? new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-')

const { exportToFile, importFromFile } = useAnnotationBackup()
const backupFile = ref(null)
const backupMessage = ref(null)

async function runBackup(work) {
  backupMessage.value = null
  try {
    backupMessage.value = { error: false, text: await work() }
  } catch (e) {
    backupMessage.value = { error: true, text: e.message || 'Erreur pendant la sauvegarde.' }
  }
}

const exportNotes = () => runBackup(async () => {
  const count = await exportToFile()
  return count ? `${count} fiche(s) annotée(s) exportée(s).` : 'Aucune note ni aucun emoji à exporter.'
})

async function onFileChosen(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return
  await runBackup(async () => {
    const count = await importFromFile(file)
    return `${count} fiche(s) annotée(s) importée(s).`
  })
}
</script>

<template>
  <div class="bases-page">
    <form class="new-base" @submit.prevent="create">
      <input type="text" v-model="newName" placeholder="Nom de la nouvelle base (ex : BTP Bretagne)">
      <button type="submit" class="primary inline" :disabled="!newName.trim()">Créer la base</button>
    </form>

    <div v-if="bases.length === 0" class="status">
      Aucune base pour l'instant. Une base regroupe les entreprises correspondant à des filtres :
      créez-en une pour commencer.
    </div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>État</th>
            <th>En local</th>
            <th>Sur l'API</th>
            <th>Dernier téléchargement</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="base in bases" :key="base.id">
            <td><a class="company-link" href="#" @click.prevent="emit('open', base.id)">{{ base.name }}</a></td>
            <td>
              <span class="badge" :class="base.status === 'ready' ? 'active' : base.status === 'partial' ? 'warn' : 'neutral'">
                {{ STATUS_LABELS[base.status] }}
              </span>
            </td>
            <td>{{ localCounts[base.id] ?? 0 }}</td>
            <td>{{ base.remoteTotal ?? '-' }}</td>
            <td>{{ formatDate(base.downloadedAt) }}</td>
            <td class="row-actions">
              <button type="button" class="secondary" @click="emit('open', base.id)">Ouvrir</button>
              <button type="button" class="secondary danger" @click="remove(base)">Supprimer</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section class="backup">
      <h2>Sauvegarde des notes et emojis</h2>
      <p>
        Exporte uniquement vos notes et emojis (pas les entreprises, qui se re-téléchargent depuis l'API).
        À l'import, les notes et emojis du fichier remplacent ceux déjà présents pour les mêmes entreprises.
      </p>
      <div class="backup-actions">
        <button type="button" class="secondary" @click="exportNotes">Exporter</button>
        <button type="button" class="secondary" @click="backupFile.click()">Importer...</button>
        <input ref="backupFile" type="file" accept=".json,application/json" hidden @change="onFileChosen">
      </div>
      <div v-if="backupMessage" class="backup-message" :class="{ error: backupMessage.error }">{{ backupMessage.text }}</div>
    </section>
  </div>
</template>
