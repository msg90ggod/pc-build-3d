import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Pin the port rather than letting Vite drift to the next free one when 5173
    // is taken: every instruction in README.md and the address start.bat opens
    // say 5173, and a silent jump to 5174 leaves the browser on a dead address
    // (ERR_CONNECTION_REFUSED) while the server is in fact running fine.
    strictPort: true,
    host: true,
    open: false
  }
});