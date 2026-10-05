<script setup>
import { computed, ref, watch } from 'vue'
// Recursive self-import: Vue SFCs with <script setup> support this pattern
// so each division/groupe/classe node can render its own children the same way.
import NafTreeNode from './NafTreeNode.vue'

const props = defineProps({
  node: { type: Object, required: true },
  selected: { type: Array, required: true },
  filterText: { type: String, default: '' },
  depth: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle'])

function collectLeaves(node, out = []) {
  if (!node.children) {
    out.push(node.id)
    return out
  }
  for (const child of node.children) collectLeaves(child, out)
  return out
}

const leaves = computed(() => collectLeaves(props.node))
const isLeaf = computed(() => !props.node.children)

const state = computed(() => {
  const selectedSet = new Set(props.selected)
  if (isLeaf.value) return selectedSet.has(props.node.id) ? 'checked' : 'unchecked'
  const checkedCount = leaves.value.filter(id => selectedSet.has(id)).length
  if (checkedCount === 0) return 'unchecked'
  if (checkedCount === leaves.value.length) return 'checked'
  return 'indeterminate'
})

function matchesFilter(node, q) {
  if (!q) return true
  if (node.id.toLowerCase().includes(q) || node.label.toLowerCase().includes(q)) return true
  return Boolean(node.children && node.children.some(c => matchesFilter(c, q)))
}

const q = computed(() => props.filterText.trim().toLowerCase())
const visible = computed(() => matchesFilter(props.node, q.value))

const expanded = ref(false)
watch(q, val => {
  if (val) expanded.value = true
})

function toggleExpand() {
  expanded.value = !expanded.value
}

function onCheckboxChange() {
  emit('toggle', { leaves: leaves.value, nextChecked: state.value !== 'checked' })
}
</script>

<template>
  <div v-if="visible" class="naf-node" :style="{ paddingLeft: depth * 14 + 'px' }">
    <div class="naf-node-row">
      <button
        v-if="node.children"
        type="button"
        class="naf-expand"
        @click="toggleExpand"
      >{{ expanded || q ? '▾' : '▸' }}</button>
      <span v-else class="naf-expand-spacer"></span>
      <input
        type="checkbox"
        :checked="state === 'checked'"
        :indeterminate.prop="state === 'indeterminate'"
        @change="onCheckboxChange"
      >
      <span class="naf-node-label">{{ node.id }} - {{ node.label }}</span>
    </div>
    <div v-if="node.children && (expanded || q)">
      <NafTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected="selected"
        :filter-text="filterText"
        :depth="depth + 1"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </div>
</template>
