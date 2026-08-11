import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
    // `server-only` resolves to a module that throws unless the bundler picks
    // its "react-server" export condition. Vitest doesn't, so importing any
    // server module under test would fail on that line alone. Point it at the
    // package's own no-op entry — exactly what Next resolves it to on the server.
    conditions: ["react-server", "node", "import"],
  },
});
