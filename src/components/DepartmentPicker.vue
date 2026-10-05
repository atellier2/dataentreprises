<script setup>
import { ref, computed } from 'vue'
import { DEPARTMENTS } from '../data/departments'

const selected = defineModel({ default: () => [] })

const filterText = ref('')

const filteredDepartments = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return DEPARTMENTS
  return DEPARTMENTS.filter(d =>
    d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q)
  )
})

function remove(code) {
  selected.value = selected.value.filter(c => c !== code)
}
</script>

<template>
  <div class="field">
    <label>Département(s)</label>
    <input type="search" v-model="filterText" placeholder="Filtrer (nom ou code)...">
    <div class="pick-box">
      <label class="pick-item" v-for="d in filteredDepartments" :key="d.code">
        <input type="checkbox" :value="d.code" v-model="selected">
        <span>{{ d.code }} - {{ d.name }}</span>
      </label>
      <div v-if="filteredDepartments.length === 0" class="pick-empty">Aucun département trouvé</div>
    </div>
    <div class="selected-tags" v-if="selected.length">
      <span class="tag" v-for="code in selected" :key="code">
        {{ code }}
        <button type="button" @click="remove(code)">&times;</button>
      </span>
    </div>
  </div>
</template>
