<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  dataUrl: { type: String, required: true },
  fieldLabel: { type: String, required: true },
  hint: { type: String, default: '' }
})

const selected = defineModel({ default: () => [] })

const allCodes = ref([])
const filterText = ref('')
const isOpen = ref(false)
const rootEl = ref(null)

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${props.dataUrl}`)
    allCodes.value = await res.json()
  } catch {
    allCodes.value = []
  }
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function handleOutsideClick(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) isOpen.value = false
}

function toggleOpen() {
  isOpen.value = !isOpen.value
}

const filteredCodes = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return allCodes.value
  return allCodes.value.filter(a =>
    a.id.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)
  )
})

const summaryLabel = computed(() => {
  if (selected.value.length === 0) return `Toutes (${allCodes.value.length})`
  if (selected.value.length === 1) return '1 sélectionnée'
  return `${selected.value.length} sélectionnées`
})

function remove(code) {
  selected.value = selected.value.filter(c => c !== code)
}
</script>

<template>
  <div class="field" ref="rootEl">
    <label>{{ fieldLabel }}</label>
    <button type="button" class="dropdown-toggle" @click="toggleOpen">
      <span>{{ summaryLabel }}</span>
      <span class="chevron">{{ isOpen ? '▲' : '▼' }}</span>
    </button>
    <div class="dropdown-panel" v-if="isOpen">
      <input type="search" v-model="filterText" placeholder="Filtrer...">
      <div class="pick-box">
        <label class="pick-item" v-for="a in filteredCodes" :key="a.id">
          <input type="checkbox" :value="a.id" v-model="selected">
          <span>{{ a.id }} - {{ a.label }}</span>
        </label>
        <div v-if="filteredCodes.length === 0" class="pick-empty">Aucun résultat trouvé</div>
      </div>
    </div>
    <div class="selected-tags" v-if="selected.length">
      <span class="tag" v-for="code in selected" :key="code">
        {{ code }}
        <button type="button" @click="remove(code)">&times;</button>
      </span>
    </div>
    <div class="hint" v-if="hint">{{ hint }}</div>
  </div>
</template>
