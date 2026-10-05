<script setup>
const scope = defineModel({ default: 'both' })

const options = [
  { value: 'siege', label: 'Sièges uniquement' },
  { value: 'etablissement', label: 'Établissements uniquement' },
  { value: 'both', label: 'Les deux' }
]
</script>

<template>
  <div class="field">
    <label>Recherche portant sur</label>
    <div class="scope-options">
      <label class="scope-option" v-for="opt in options" :key="opt.value">
        <input type="radio" name="scope" :value="opt.value" v-model="scope">
        <span>{{ opt.label }}</span>
      </label>
    </div>
    <div class="hint">
      "Siège" garde les entreprises dont le siège social correspond aux autres filtres (département
      notamment), "établissement" celles qui n'y ont qu'une agence ou un site secondaire.
    </div>
  </div>
</template>
