<script setup>
import { ref, computed } from 'vue'

const MAX_SHOWN = 100

const props = defineProps({
  // [{ value, count }], already sorted: the values present in the base.
  options: { type: Array, required: true },
  labelOf: { type: Function, default: v => v }
})

const selected = defineModel({ default: () => [] })
const filterText = ref('')

const shown = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  const list = q
    ? props.options.filter(o => props.labelOf(o.value).toLowerCase().includes(q))
    : props.options
  return list.slice(0, MAX_SHOWN)
})

const hiddenCount = computed(() => {
  const q = filterText.value.trim()
  const total = q
    ? props.options.filter(o => props.labelOf(o.value).toLowerCase().includes(q.toLowerCase())).length
    : props.options.length
  return Math.max(0, total - MAX_SHOWN)
})
</script>

<template>
  <div class="facet">
    <input
      v-if="options.length > 8"
      type="search"
      v-model="filterText"
      placeholder="Filtrer..."
    >
    <div class="pick-box">
      <label class="pick-item" v-for="o in shown" :key="o.value">
        <input type="checkbox" :value="o.value" v-model="selected">
        <span class="facet-label">{{ labelOf(o.value) }}</span>
        <span class="facet-count">{{ o.count }}</span>
      </label>
      <div v-if="shown.length === 0" class="pick-empty">Aucune valeur</div>
      <div v-if="hiddenCount > 0" class="pick-more">
        {{ hiddenCount }} autre(s) valeur(s) : utilisez le filtre ci-dessus.
      </div>
    </div>
    <button v-if="selected.length" type="button" class="link-btn" @click="selected = []">
      Tout décocher ({{ selected.length }})
    </button>
  </div>
</template>
