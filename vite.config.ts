import { defineConfig } from 'vite';
import autoApiPlugin from './vite-plugin-auto-api'

export default defineConfig({
    plugins: [autoApiPlugin()]
})