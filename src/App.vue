<script setup>
import { ref, onMounted } from 'vue'
import BasesList from './components/BasesList.vue'
import BaseView from './components/BaseView.vue'
import { useBases } from './composables/useBases'

const { loaded, loadBases } = useBases()
const currentId = ref(null)
const loadError = ref(null)

onMounted(() => {
  loadBases().catch(() => {
    loadError.value = "Impossible d'ouvrir la base de données locale du navigateur."
  })
})
</script>

<template>
  <header class="app-header">
    <h1 v-if="!currentId">Prospection - Recherche d'entreprises</h1>
    <!-- An open base puts its back button and name here (see BaseView). -->
    <div id="app-header-slot" class="header-slot"></div>
    <a
      class="header-link"
      href="https://recherche-entreprises.api.gouv.fr"
      target="_blank"
      rel="noopener"
      title="Les bases locales sont alimentées par l'API publique recherche-entreprises.api.gouv.fr"
    >API recherche-entreprises</a>
  </header>

  <main class="page">
    <div v-if="loadError" class="status error">{{ loadError }}</div>
    <div v-else-if="!loaded" class="status">Chargement...</div>
    <BaseView v-else-if="currentId" :key="currentId" :base-id="currentId" @back="currentId = null" />
    <BasesList v-else @open="id => (currentId = id)" />
  </main>
</template>
