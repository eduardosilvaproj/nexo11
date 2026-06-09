import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "./styles/responsive.css";
import "./styles/sidebar-animations.css";

// Build marker — forçado para trigger rebuild do Lovable
const BUILD_TAG = "nexus-build-2025-01-pinfix";
console.info(`[Nexus] ${BUILD_TAG}`);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ErrorBoundary>
);
