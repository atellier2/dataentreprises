import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // En CI (GitHub Pages) BASE_PATH vaut /<nom-du-depot>/ ; en local, "/"
  base: process.env.BASE_PATH || '/',
  plugins: [vue()],
})
