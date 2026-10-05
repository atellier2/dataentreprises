<script setup>
import { ref, computed } from 'vue'
import DefinitionPanel from './DefinitionPanel.vue'
import ConsultationPanel from './ConsultationPanel.vue'
import { useBases } from '../composables/useBases'
import { useBaseDownload } from '../composables/useBaseDownload'

const props = defineProps({ baseId: { type: String, required: true } })
const emit = defineEmits(['back'])

const { bases, saveBase } = useBases()
const base = computed(() => bases.value.find(b => b.id === props.baseId))

const download = useBaseDownload()
// Bumped after each download so the consultation panel reloads from the db.
const consultationKey = ref(0)
const mode = ref(base.value.status === 'draft' ? 'define' : 'consult')

const progress = computed(() =>
  download.total.value ? Math.min(100, Math.round((download.downloaded.value / download.total.value) * 100)) : 0
)

function renameBase(event) {
  const name = event.target.value.trim()
  if (!name) {
    event.target.value = base.value.name
    return
  }
  base.value.name = name
  saveBase(base.value)
}

// A never-downloaded base keeps its half-edited filters across reloads. One
// that's already downloaded only takes new filters when they're validated.
let draftTimer = null
function onDraftChange(filters) {
  if (base.value.status !== 'draft') return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    base.value.filters = filters
    saveBase(base.value)
  }, 500)
}

async function runDownload() {
  await download.start(base.value)
  mode.value = 'consult'
  consultationKey.value++
}

// Brings back every fiche deleted by hand: forget the exclusions, re-download.
function restoreExcluded() {
  base.value.excluded = []
  runDownload()
}

function validateFilters(filters) {
  clearTimeout(draftTimer)
  base.value.filters = filters
  base.value.localFilters = null // facets of the old perimeter may not exist any more
  runDownload()
}

function goBack() {
  if (download.running.value) return
  emit('back')
}
</script>

<template>
  <div class="base-view" v-if="base">
    <Teleport to="#app-header-slot">
      <div class="base-header">
        <button type="button" class="secondary" :disabled="download.running.value" @click="goBack">&larr; Bases</button>
        <input
          type="text"
          class="base-name"
          :value="base.name"
          :disabled="download.running.value"
          @change="renameBase"
        >
      </div>
    </Teleport>

    <div v-if="download.running.value" class="status progress-card">
      <p>
        Téléchargement des fiches :
        <strong>{{ download.downloaded.value }}</strong>
        <template v-if="download.total.value !== null"> / {{ download.total.value }}</template>
      </p>
      <div class="progress"><div class="progress-bar" :style="{ width: progress + '%' }"></div></div>
      <button type="button" class="secondary" @click="download.cancel">Annuler</button>
    </div>

    <template v-else>
      <div v-if="download.error.value && mode === 'define'" class="status error">{{ download.error.value }}</div>

      <DefinitionPanel
        v-if="mode === 'define'"
        :initial-filters="base.filters"
        :can-cancel="base.status !== 'draft'"
        :confirm-label="base.status === 'draft' ? 'Valider et télécharger' : 'Appliquer et re-télécharger'"
        @change="onDraftChange"
        @validate="validateFilters"
        @cancel="mode = 'consult'"
      />

      <ConsultationPanel
        v-else
        :key="consultationKey"
        :base="base"
        @edit-criteria="mode = 'define'"
        @restore="restoreExcluded"
      />
    </template>
  </div>
</template>
