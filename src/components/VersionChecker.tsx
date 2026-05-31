import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function VersionChecker() {
  const initialVersion = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    async function fetchVersion() {
      try {
        const res = await fetch("/version.json?t=" + Date.now(), {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const version = data.buildTime || data.version;

        if (!initialVersion.current) {
          initialVersion.current = version;
          return;
        }

        if (version !== initialVersion.current && !updateAvailable) {
          setUpdateAvailable(true);
          toast("Nova versão disponível", {
            description: "Clique para atualizar o sistema.",
            duration: Infinity,
            action: {
              label: "Atualizar",
              onClick: () => {
                window.location.reload();
              },
            },
          });
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    // Check immediately
    fetchVersion();

    // Then check periodically
    const interval = setInterval(fetchVersion, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [updateAvailable]);

  return null;
}
