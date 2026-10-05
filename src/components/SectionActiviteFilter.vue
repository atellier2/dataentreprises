<script setup>
import { SECTIONS } from '../data/sections'

const selected = defineModel({ default: () => [] })

function remove(code) {
  selected.value = selected.value.filter(c => c !== code)
}
</script>

<template>
  <div class="field">
    <label>Section d'activité (grand secteur)</label>
    <div class="pick-box">
      <label class="pick-item" v-for="s in SECTIONS" :key="s.code">
        <input type="checkbox" :value="s.code" v-model="selected">
        <span>{{ s.code }} - {{ s.label }}</span>
      </label>
    </div>
    <div class="selected-tags" v-if="selected.length">
      <span class="tag" v-for="code in selected" :key="code">
        {{ code }}
        <button type="button" @click="remove(code)">&times;</button>
      </span>
    </div>
    <div class="hint">Regroupement large par grand secteur (nomenclature Insee NAF, 21 sections).</div>
  </div>
</template>
