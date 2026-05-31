import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Plugin to generate version.json on each build
function versionPlugin() {
  return {
    name: "version-json",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      if (fs.existsSync(distDir)) {
        const versionData = {
          version: Date.now().toString(36),
          buildTime: new Date().toISOString(),
        };
        fs.writeFileSync(
          path.resolve(distDir, "version.json"),
          JSON.stringify(versionData)
        );
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), versionPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
