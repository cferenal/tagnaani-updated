import base44 from "@base44/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { createTagnaApi } from "./server/api.js";

export default defineConfig({
  build: {
    sourcemap: false,
  },
  server: { host: true },
  plugins: [
    {
      name: "tagna-api",
      configureServer(server) {
        const handleApi = createTagnaApi();
        server.middlewares.use("/__tagna", (req, res) =>
          handleApi(req, res, new URL(req.url, "http://localhost").pathname));
      },
    },
    base44({
      hmrNotifier: false,
      navigationNotifier: false,
      analyticsTracker: false,
      visualEditAgent: false,
    }),
    tanstackStart({ srcDirectory: "src" }),
    react(),
  ],
});