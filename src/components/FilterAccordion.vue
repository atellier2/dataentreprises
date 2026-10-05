<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  defaultOpen: { type: Boolean, default: false }
})

const isOpen = ref(props.defaultOpen)
</script>

<template>
  <div class="accordion-section">
    <button type="button" class="accordion-header" @click="isOpen = !isOpen">
      <span>{{ title }}</span>
      <span class="chevron">{{ isOpen ? '▲' : '▼' }}</span>
    </button>
    <div class="accordion-body" v-if="isOpen">
      <slot />
    </div>
  </div>
</template>
