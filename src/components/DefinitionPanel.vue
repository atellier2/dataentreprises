<script setup>
import { reactive, watch, computed } from 'vue'
import DepartmentPicker from './DepartmentPicker.vue'
import NafTreePicker from './NafTreePicker.vue'
import SectionActiviteFilter from './SectionActiviteFilter.vue'
import DropdownCodePicker from './DropdownCodePicker.vue'
import SizeGroupFilter from './SizeGroupFilter.vue'
import FilterAccordion from './FilterAccordion.vue'
import ResultsTable from './ResultsTable.vue'
import { useBasePreview } from '../composables/useBasePreview'
import { hasCriteria, emptyFilters, PER_PAGE, MAX_RESULTS } from '../api/rechercheEntreprises'

const props = defineProps({
  initialFilters: { type: Object, required: true },
  // Lets an already-downloaded base go back to consultation without changes.
  canCancel: { type: Boolean, default: false },
  confirmLabel: { type: String, default: 'Valider et télécharger' }
})

const emit = defineEmits(['change', 'validate', 'cancel'])

const draft = reactive({ ...emptyFilters(), ...JSON.parse(JSON.stringify(props.initialFilters)) })
const { total, results, loading, error, tooMany } = useBasePreview(draft)

watch(draft, () => emit('change', JSON.parse(JSON.stringify(draft))), { deep: true })

const previewRows = computed(() =>
  results.value.map(company => ({ company, establishments: [company.siege || {}] }))
)

const canValidate = computed(() =>
  hasCriteria(draft) && !loading.value && !error.value && total.value > 0 && !tooMany.value
)
</script>

<template>
  <div class="layout">
    <aside class="filters">
      <h2>Filtres de téléchargement</h2>

      <FilterAccordion title="Filtre principal" :default-open="true">
        <DepartmentPicker v-model="draft.departments" />
        <NafTreePicker v-model="draft.activites" />
        <SectionActiviteFilter v-model="draft.sections" />
        <SizeGroupFilter v-model="draft.sizeGroups" />
        <DropdownCodePicker
          v-model="draft.tranchesEffectif"
          data-url="tranche-effectif.json"
          field-label="Effectif salarié (tranches précises)"
          hint="Prioritaire sur le choix TPE/PME ci-dessus pour l'effectif. Aucune tranche = toutes."
        />
      </FilterAccordion>

      <FilterAccordion title="Filtres complémentaires" :default-open="false">
        <DropdownCodePicker
          v-model="draft.formesJuridiques"
          data-url="legal-forms.json"
          field-label="Forme juridique"
          hint="Ex : SAS, SARL, EURL, association loi 1901, entrepreneur individuel..."
        />
      </FilterAccordion>
    </aside>

    <section class="results">
      <div class="panel-bar">
        <div class="remote-count">
          <template v-if="!hasCriteria(draft)">Choisissez au moins un critère.</template>
          <template v-else-if="loading">Interrogation de l'API...</template>
          <template v-else-if="error"><span class="error-text">{{ error }}</span></template>
          <template v-else-if="total !== null">
            <strong>{{ tooMany ? MAX_RESULTS + ' ou plus' : total }}</strong> fiche(s) correspondent sur l'API
          </template>
        </div>
        <div class="panel-actions">
          <button v-if="canCancel" type="button" class="secondary" @click="emit('cancel')">Annuler</button>
          <button type="button" class="primary inline" :disabled="!canValidate" @click="emit('validate', JSON.parse(JSON.stringify(draft)))">
            {{ confirmLabel }}<template v-if="canValidate"> ({{ total }})</template>
          </button>
        </div>
      </div>

      <div v-if="tooMany" class="status error">
        {{ MAX_RESULTS }} fiches ou plus correspondent : l'API ne permet d'en télécharger que {{ MAX_RESULTS }} par recherche.
        Affinez les filtres (département, activité, taille...) pour passer sous cette limite.
      </div>

      <template v-else-if="previewRows.length">
        <p class="hint preview-hint">
          Aperçu : {{ previewRows.length }} premières fiches sur {{ total }}
          ({{ PER_PAGE }} par page, rien n'est encore enregistré).
        </p>
        <ResultsTable :rows="previewRows" />
      </template>

      <div v-else-if="hasCriteria(draft) && !loading && !error" class="status">
        Aucune fiche ne correspond à ces filtres.
      </div>

      <div v-else-if="!hasCriteria(draft)" class="status">
        Renseignez les filtres : le nombre de fiches et un aperçu s'affichent au fur et à mesure.
        Quand le périmètre vous convient, validez pour télécharger toutes les fiches.
      </div>
    </section>
  </div>
</template>
