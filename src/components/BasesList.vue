<script setup>
import { ref } from 'vue'
import { useBases } from '../composables/useBases'

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
  </div>
</template>
