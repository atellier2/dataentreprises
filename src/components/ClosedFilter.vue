<script setup>
const includeClosed = defineModel({ default: false })
</script>

<template>
  <div class="field">
    <label class="scope-option">
      <input type="checkbox" v-model="includeClosed">
      <span>Inclure les établissements fermés</span>
    </label>
    <div class="hint">
      Par défaut, seuls les établissements encore en activité sont affichés.
    </div>
  </div>
</template>
