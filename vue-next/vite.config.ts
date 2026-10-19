import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/vue-next/dist/',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: 'src/bridge.ts',
      formats: ['es'],
      fileName: () => 'portal-rym-vue-next.js',
    },
    rollupOptions: { output: { assetFileNames: 'portal-rym-vue-next[extname]', chunkFileNames: 'portal-rym-vue-next-[name].js' } },
  },
})
