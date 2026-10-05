<script setup>
import { ref, computed } from 'vue'
import { useLabels } from '../composables/useLabels'
import EmojiPicker from './EmojiPicker.vue'
import { pickerStyle } from '../utils/pickerPosition'

const props = defineProps({
  // [{ company, establishments }]
  rows: { type: Array, required: true },
  // { [siren]: text }. null = no notes column (read-only preview).
  notes: { type: Object, default: null },
  // { [siren]: emoji }. null = no emoji column.
  emojis: { type: Object, default: null },
  // Adds a checkbox column, bound to `selected` (array of sirens).
  selectable: { type: Boolean, default: false }
})

const emit = defineEmits(['update-note', 'update-emoji'])

// One picker for the whole table, placed from the clicked button's position
// (fixed, so the table's own scroll area doesn't clip it).
const picker = ref(null) // { siren, style }

function openPicker(siren, event) {
  if (picker.value?.siren === siren) {
    picker.value = null
    return
  }
  picker.value = { siren, style: pickerStyle(event.currentTarget.getBoundingClientRect()) }
}

function pickEmoji(emoji) {
  emit('update-emoji', { siren: picker.value.siren, emoji })
  picker.value = null
}

const selected = defineModel('selected', { default: () => [] })

const selectedSet = computed(() => new Set(selected.value))
const allSelected = computed(() => props.rows.length > 0 && props.rows.every(r => selectedSet.value.has(r.company.siren)))

function toggleAll() {
  selected.value = allSelected.value ? [] : props.rows.map(r => r.company.siren)
}

function toggleOne(siren) {
  selected.value = selectedSet.value.has(siren)
    ? selected.value.filter(s => s !== siren)
    : [...selected.value, siren]
}

const { activityLabel, legalFormLabel, trancheEffectifLabel } = useLabels()

function googleSearchUrl(row) {
  const name = row.company.nom_complet || row.company.nom_raison_sociale || ''
  const commune = row.establishments[0]?.libelle_commune || ''
  const query = [name, commune].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function formatAddress(establishments) {
  const first = establishments[0] || {}
  const addr = first.adresse || [first.code_postal, first.libelle_commune].filter(Boolean).join(' ') || '-'
  return establishments.length > 1 ? `${addr} (+${establishments.length - 1} autre(s) établissement(s))` : addr
}
</script>

<template>
  <div class="results-table">
    <EmojiPicker
      v-if="picker"
      :style="picker.style"
      :current="emojis?.[picker.siren] || ''"
      @select="pickEmoji"
      @close="picker = null"
    />
    <div class="table-wrap table-scroll" @scroll="picker = null">
      <table>
        <thead>
          <tr>
            <th v-if="selectable" class="select-col">
              <input
                type="checkbox"
                :checked="allSelected"
                :title="'Sélectionner les ' + rows.length + ' fiches filtrées'"
                @change="toggleAll"
              >
            </th>
            <th v-if="emojis" class="emoji-col"></th>
            <th>Nom</th>
            <th>Activité principale</th>
            <th>Forme juridique</th>
            <th>Tranche d'effectif</th>
            <th>Adresse</th>
            <th>Création</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.company.siren"
            :class="{ selected: selectedSet.has(row.company.siren) }"
          >
            <td v-if="selectable" class="select-col">
              <input
                type="checkbox"
                :checked="selectedSet.has(row.company.siren)"
                @change="toggleOne(row.company.siren)"
              >
            </td>
            <td v-if="emojis" class="emoji-col">
              <button
                type="button"
                class="emoji-btn"
                :class="{ empty: !emojis[row.company.siren] }"
                :title="emojis[row.company.siren] ? 'Changer ou retirer l\'emoji' : 'Ajouter un emoji'"
                @click="openPicker(row.company.siren, $event)"
              >{{ emojis[row.company.siren] || '＋' }}</button>
            </td>
            <td class="name-cell">
              <a
                class="company-link"
                :href="'https://annuaire-entreprises.data.gouv.fr/entreprise/' + row.company.siren"
                target="_blank"
                rel="noopener"
              >
                {{ row.company.nom_complet || row.company.nom_raison_sociale || '(nom inconnu)' }}
              </a>
              <a
                class="google-link"
                :href="googleSearchUrl(row)"
                target="_blank"
                rel="noopener"
                title="Rechercher cette entreprise sur Google"
              >Google</a>
              <input
                v-if="notes"
                type="text"
                class="notes-input"
                :value="notes[row.company.siren] || ''"
                placeholder="Note..."
                @change="emit('update-note', { siren: row.company.siren, text: $event.target.value })"
              >
            </td>
            <td>{{ activityLabel(row.company.activite_principale) }}</td>
            <td>{{ legalFormLabel(row.company.nature_juridique) }}</td>
            <td>{{ trancheEffectifLabel(row.company.tranche_effectif_salarie) }}</td>
            <td>{{ formatAddress(row.establishments) }}</td>
            <td>{{ row.company.date_creation || '-' }}</td>
            <td>
              <span class="badge" :class="row.company.etat_administratif === 'A' ? 'active' : 'ceased'">
                {{ row.company.etat_administratif === 'A' ? 'Active' : 'Cessée' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
