<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { EMOJI_PALETTE, normalizeEmoji } from '../utils/emoji'

const props = defineProps({
  current: { type: String, default: '' },
  // Offer "Retirer" even without a current emoji (bulk edits).
  allowClear: { type: Boolean, default: false }
})
const emit = defineEmits(['select', 'close'])

const rootEl = ref(null)
const typed = ref('')

function onTyped() {
  const emoji = normalizeEmoji(typed.value)
  if (emoji) emit('select', emoji)
  else if (typed.value) typed.value = ''
}

// mousedown rather than click: the click that opened the picker is still
// propagating when this mounts and would immediately close it.
function onOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) emit('close')
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', onOutside)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="emoji-picker" ref="rootEl">
    <div class="emoji-grid">
      <button
        v-for="e in EMOJI_PALETTE"
        :key="e"
        type="button"
        :class="{ active: e === current }"
        @click="emit('select', e)"
      >{{ e }}</button>
    </div>
    <input
      type="text"
      v-model="typed"
      placeholder="Autre emoji : saisir ou coller"
      @input="onTyped"
    >
    <button v-if="current || allowClear" type="button" class="secondary" @click="emit('select', '')">
      Retirer l'emoji
    </button>
  </div>
</template>
