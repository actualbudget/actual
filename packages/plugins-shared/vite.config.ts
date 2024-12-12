import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as path from "path";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true, include: ["src"] })],
  resolve: {
    alias: {
      '@loot-core': path.resolve(__dirname, '../loot-core/src'),
    }
  },
  build: {
    lib: {
      entry: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "src/index.ts"
      ),
      name: "Shared",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "@emotion/css"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
