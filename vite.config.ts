/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// base './' – relativní cesty, aby build fungoval i v Capacitoru (Android) a z podsložky.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Verze appky do exportu zálohy (Fáze 8).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
