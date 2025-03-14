import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from "path"

// https://vite.dev/config/
export default defineConfig({
  build:{
    rollupOptions:{
      input:{
        css: resolve(__dirname,"src/index.scss"),
        popup: resolve(__dirname, "src/index.html"),
        background: resolve(__dirname, "src/background.ts"),
        popupScript: resolve(__dirname, "src/popup.ts")
      },
      output:{
        entryFileNames: "[name].js"
      }
    }
  },
  plugins: [react()],
})
