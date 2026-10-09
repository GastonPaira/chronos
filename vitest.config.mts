// Configuración de tests (Vitest). Correr con `npm test`.
import path from 'path';
import { defineConfig } from 'vitest/config';

// Tests run in Argentina's time zone so date bugs (UTC vs local) show up.
process.env.TZ = 'America/Argentina/Buenos_Aires';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
