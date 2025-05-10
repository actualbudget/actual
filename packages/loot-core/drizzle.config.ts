import { defineConfig } from 'drizzle-kit';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema',
  casing: 'snake_case',
  strict: true,
  introspect: {
    casing: 'preserve',
  },
});
