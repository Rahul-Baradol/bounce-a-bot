import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts', 
      name: 'bouncy-bot-sdk',
      fileName: (format) => `bouncy-bot-sdk.${format}.js`,
    },
    rollupOptions: {
      external: [],
    },
  },
})