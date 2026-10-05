<script setup>
import { ref, computed, watch } from 'vue'
import FilterAccordion from './FilterAccordion.vue'
import FacetFilter from './FacetFilter.vue'
import ScopeFilter from './ScopeFilter.vue'
import ClosedFilter from './ClosedFilter.vue'
import ResultsTable from './ResultsTable.vue'
import EmojiPicker from './EmojiPicker.vue'
import { pickerStyle } from '../utils/pickerPosition'
import { useConsultation, NO_EMOJI } from '../composables/useConsultation'
import { useLabels } from '../composables/useLabels'

const props = defineProps({
  base: { type: Object, required: true }
})

const emit = defineEmits(['edit-criteria', 'restore'])

const { filters, loading, totalLocal, rows, facets, notes, emojis, updateNote, updateEmoji, updateEmojis, removeCompanies, resetFilters } = useConsultation(props.base)

const selected = ref([])
// A fiche that a filter hides can't be deleted by mistake: only the selected
// fiches still displayed count.
const selectedVisible = computed(() => {
  const shown = new Set(rows.value.map(r => r.company.siren))
  return selected.value.filter(siren => shown.has(siren))
})
watch(rows, () => { selected.value = selectedVisible.value })

// Same emoji for every selected fiche, in one go.
const bulkPickerStyle = ref(null)

function openBulkPicker(event) {
  bulkPickerStyle.value = pickerStyle(event.currentTarget.getBoundingClientRect())
}

function applyBulkEmoji(emoji) {
  updateEmojis(selectedVisible.value, emoji)
  bulkPickerStyle.value = null
}

async function deleteSelected() {
  const sirens = selectedVisible.value
  const n = sirens.length
  if (!confirm(`Supprimer ${n} entreprise(s) de cette base ? Elles ne seront plus téléchargées lors des mises à jour (restauration possible). Les notes sont conservées.`)) return
  await removeCompanies(sirens)
  selected.value = []
}
const { activityLabel, legalFormLabel, trancheEffectifLabel, departementLabel, sectionLabel, categorieLabel } = useLabels()

const emojiLabel = value => (value === NO_EMOJI ? 'Sans emoji' : value)

const FACET_SECTIONS = [
  { key: 'emojis', title: 'Emoji', labelOf: emojiLabel, open: true },
  { key: 'departements', title: 'Département', labelOf: departementLabel, open: true },
  { key: 'sections', title: "Section d'activité", labelOf: sectionLabel, open: false },
  { key: 'activites', title: 'Activité (NAF)', labelOf: activityLabel, open: false },
  { key: 'formes', title: 'Forme juridique', labelOf: legalFormLabel, open: false },
  { key: 'tranches', title: "Tranche d'effectif", labelOf: trancheEffectifLabel, open: false },
  { key: 'categories', title: "Catégorie d'entreprise", labelOf: categorieLabel, open: false }
]

const excludedCount = computed(() => props.base.excluded.length)
</script>

<template>
  <div class="consultation">
    <div class="layout">
      <aside class="filters">
        <div class="base-summary">
          <!-- Only shown when something needs attention. -->
          <div class="stats" v-if="base.status === 'partial'">
            <span class="badge warn">Téléchargement incomplet</span>
            <span v-if="base.error" class="error-text">{{ base.error }}</span>
          </div>
          <div class="stats" v-if="excludedCount">
            {{ excludedCount }} supprimée(s)
            <button type="button" class="link-btn inline-link" @click="emit('restore')">Restaurer</button>
          </div>
          <div class="panel-actions">
            <button type="button" class="secondary" @click="emit('edit-criteria')">Modifier les critères</button>
          </div>
        </div>

        <h2>
          Filtres de consultation
          <span
            class="info-tip"
            tabindex="0"
            role="img"
            aria-label="Valeurs présentes dans cette base. Ces filtres n'interrogent jamais l'API."
            title="Valeurs présentes dans cette base. Ces filtres n'interrogent jamais l'API."
          >ⓘ</span>
        </h2>

        <div class="field">
          <input type="search" v-model="filters.search" placeholder="Nom, SIREN, commune...">
        </div>

        <FilterAccordion
          v-for="f in FACET_SECTIONS"
          :key="f.key"
          :title="f.title + (filters[f.key].length ? ' (' + filters[f.key].length + ')' : '')"
          :default-open="f.open"
        >
          <FacetFilter v-model="filters[f.key]" :options="facets[f.key]" :label-of="f.labelOf" />
        </FilterAccordion>

        <FilterAccordion title="Établissements" :default-open="false">
          <ScopeFilter v-model="filters.scope" />
          <ClosedFilter v-model="filters.includeClosed" />
        </FilterAccordion>

        <button type="button" class="secondary" style="width: 100%;" @click="resetFilters">
          Réinitialiser les filtres
        </button>
      </aside>

      <section class="results">
        <div v-if="loading" class="status">Chargement de la base...</div>
        <template v-else>
          <div class="results-header">
            <div class="count">{{ rows.length }} affichée(s) sur {{ totalLocal }} en base</div>
            <div class="panel-actions" v-if="selectedVisible.length">
              <span class="count">{{ selectedVisible.length }} sélectionnée(s)</span>
              <button type="button" class="secondary" @click="openBulkPicker">Emoji...</button>
              <button type="button" class="secondary" @click="selected = []">Désélectionner</button>
              <button type="button" class="secondary danger" @click="deleteSelected">Supprimer de la base</button>
            </div>
          </div>
          <EmojiPicker
            v-if="bulkPickerStyle"
            :style="bulkPickerStyle"
            allow-clear
            @select="applyBulkEmoji"
            @close="bulkPickerStyle = null"
          />
          <div v-if="rows.length === 0" class="status">
            {{ totalLocal === 0 ? 'Cette base est vide.' : 'Aucune fiche ne correspond à ces filtres.' }}
          </div>
          <ResultsTable
            v-else
            :rows="rows"
            :notes="notes"
            :emojis="emojis"
            selectable
            v-model:selected="selected"
            @update-note="({ siren, text }) => updateNote(siren, text)"
            @update-emoji="({ siren, emoji }) => updateEmoji(siren, emoji)"
          />
        </template>
      </section>
    </div>
  </div>
</template>
