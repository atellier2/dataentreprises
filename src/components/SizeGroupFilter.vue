<script setup>
const sizeGroups = defineModel({ default: () => [] })

const options = [
  { value: 'ei', label: 'Entreprise individuelle / auto-entrepreneur' },
  { value: 'tpe', label: 'TPE (0 à 9 salariés)' },
  { value: 'pme', label: 'PME (10 à 249 salariés)' },
  { value: 'eti', label: 'ETI (250 salariés et plus)' }
]
</script>

<template>
  <div class="field">
    <label>Taille / type d'entreprise</label>
    <div class="scope-options">
      <label class="scope-option" v-for="opt in options" :key="opt.value">
        <input type="checkbox" :value="opt.value" v-model="sizeGroups">
        <span>{{ opt.label }}</span>
      </label>
    </div>
    <div class="hint">
      Aucune case cochée = toutes tailles. Regroupement basé sur les données Insee : effectif
      salarié pour TPE, catégorie officielle (PME/ETI) pour les autres, forme juridique pour
      les entreprises individuelles.
    </div>
  </div>
</template>
