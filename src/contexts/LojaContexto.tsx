import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Contexto de loja ativa.
 *
 * - Para usuarios com papel admin_master / franqueador:
 *   podem escolher entre "all" (visao plataforma) ou uma loja especifica.
 *   O RLS NAO eh restringido (admin_master sempre ve tudo), mas o frontend
 *   usa este valor para filtrar listas e dashboards.
 *
 * - Para outros papeis: o contexto fica "travado" na loja do perfil
 *   (perfil.loja_id) e nao pode ser alterado pela UI.
 *
 * Persistencia: localStorage por usuario, com chave "nexus:loja_ativa:{userId}".
 */

export type LojaContextoValor = "all" | string;

interface LojaContextValue {
  /** "all" = visao plataforma (so admin_master/franqueador). UUID = loja especifica. */
  contexto: LojaContextoValor;
  /** Lista de lojas disponiveis para selecao. */
  lojas: { id: string; nome: string; cidade?: string | null }[];
  /** True se o usuario pode alterar o contexto (admin_master / franqueador). */
  podeSelecionar: boolean;
  /** True se o contexto atual eh "all" (apenas admin_master). */
  isPlataforma: boolean;
  /** Define o contexto. No-op se !podeSelecionar. */
  setContexto: (v: LojaContextoValor) => void;
  /** Carregando lista de lojas. */
  loading: boolean;
}

const LojaContextoContext = createContext<LojaContextValue | undefined>(undefined);

function storageKey(userId: string) {
  return `nexus:loja_ativa:${userId}`;
}

export function LojaContextoProvider({ children }: { children: ReactNode }) {
  const { perfil, user, roles, loading: authLoading } = useAuth();

  const podeSelecionar = useMemo(
    () => roles.includes("admin_master") || roles.includes("franqueador"),
    [roles],
  );

  const [contexto, setContextoState] = useState<LojaContextoValor>(() => {
    if (typeof window === "undefined") return "all";
    return "all";
  });

  // Carregar lista de lojas
  const { data: lojasRaw, isLoading: lojasLoading } = useQuery({
    queryKey: ["lojas", "contexto-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        .select("id, nome, cidade")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !authLoading && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const lojas = useMemo(
    () => (lojasRaw ?? []).map((l) => ({ id: l.id, nome: l.nome, cidade: l.cidade })),
    [lojasRaw],
  );

  // Restaurar preferencia do localStorage quando o usuario loga
  useEffect(() => {
    if (authLoading || !user) return;

    if (!podeSelecionar) {
      // Usuario normal: trava na propria loja
      setContextoState(perfil?.loja_id ?? "all");
      return;
    }

    // Admin/franqueador: le do localStorage; default "all"
    const stored = window.localStorage.getItem(storageKey(user.id));
    if (stored && (stored === "all" || lojas.some((l) => l.id === stored))) {
      setContextoState(stored);
    } else {
      setContextoState("all");
    }
  }, [authLoading, user, perfil?.loja_id, podeSelecionar, lojas]);

  const setContexto = useCallback(
    (v: LojaContextoValor) => {
      if (!podeSelecionar) return; // bloqueia
      setContextoState(v);
      if (user) {
        window.localStorage.setItem(storageKey(user.id), v);
      }
    },
    [podeSelecionar, user],
  );

  const isPlataforma = contexto === "all";

  return (
    <LojaContextoContext.Provider
      value={{
        contexto,
        lojas,
        podeSelecionar,
        isPlataforma,
        setContexto,
        loading: lojasLoading,
      }}
    >
      {children}
    </LojaContextoContext.Provider>
  );
}

export function useLojaContexto() {
  const ctx = useContext(LojaContextoContext);
  if (!ctx) {
    // Se nao estiver dentro do provider, retorna um fallback seguro
    return {
      contexto: "all" as LojaContextoValor,
      lojas: [],
      podeSelecionar: false,
      isPlataforma: true,
      setContexto: () => {},
      loading: false,
    };
  }
  return ctx;
}
