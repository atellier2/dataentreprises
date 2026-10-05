<script setup>
import { ref, onMounted } from 'vue'
import NafTreeNode from './NafTreeNode.vue'

const selected = defineModel({ default: () => [] })

const tree = ref([])
const filterText = ref('')

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}naf-tree.json`)
    tree.value = await res.json()
  } catch {
    tree.value = []
  }
})

function handleToggle({ leaves, nextChecked }) {
  const set = new Set(selected.value)
  if (nextChecked) leaves.forEach(id => set.add(id))
  else leaves.forEach(id => set.delete(id))
  selected.value = [...set]
}

function remove(code) {
  selected.value = selected.value.filter(c => c !== code)
}
</script>

<template>
  <div class="field">
    <label>Activité principale (code APE/NAF)</label>
    <input
      type="search"
      v-model="filterText"
      placeholder="Filtrer (ex : boulangerie, 62.01, informatique...)"
    >
    <div class="pick-box naf-tree">
      <NafTreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :selected="selected"
        :filter-text="filterText"
        :depth="0"
        @toggle="handleToggle"
      />
    </div>
    <div class="selected-tags" v-if="selected.length">
      <span class="tag" v-for="code in selected" :key="code">
        {{ code }}
        <button type="button" @click="remove(code)">&times;</button>
      </span>
    </div>
    <div class="hint">
      Cochez une division, un groupe ou une classe pour sélectionner toutes ses sous-catégories.
    </div>
  </div>
</template>
