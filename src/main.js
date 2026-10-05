import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Filters used to live here before bases existed; they're now stored per base.
try {
  localStorage.removeItem('prospection.filters.v1')
} catch {
  // Storage unavailable: nothing to clean up.
}

createApp(App).mount('#app')
