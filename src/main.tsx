import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./styles/responsive.css";
import "./styles/sidebar-animations.css";

// Build marker — forçado para trigger rebuild do Lovable
const BUILD_TAG = "nexus-build-2025-01-pinfix-v2";
console.info(`[Nexus] ${BUILD_TAG}`);

// Remove spinner de fallback assim que o módulo é avaliado
const spinner = document.getElementById("nexus-fallback");
if (spinner) spinner.remove();

try {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  );
} catch (err) {
  console.error("[Nexus] Fatal init error:", err);
  document.getElementById("root")!.innerHTML = `
    <div style="position:fixed;inset:0;background:#0a0e1a;color:white;padding:24px;font-family:monospace;overflow:auto;z-index:99999;">
      <h1 style="color:#f87171;">⚠️ Erro fatal ao iniciar</h1>
      <pre style="background:#1e293b;padding:16px;border-radius:8px;color:#fbbf24;white-space:pre-wrap;">${String(err)}</pre>
    </div>
  `;
}
