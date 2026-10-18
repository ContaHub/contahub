"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import type { PortalPermission } from "@contahub/shared";
import { getPortalClientByEmail, PortalClient } from "@/lib/portal";

interface PortalClientState {
  client: PortalClient | null;
  loading: boolean;
  /** true só se o cliente tem a permissão. Falha fechada: sem dados, sempre false. */
  can: (permission: PortalPermission) => boolean;
}

const PortalClientContext = createContext<PortalClientState>({
  client: null,
  loading: true,
  can: () => false,
});

export function usePortalClient() {
  return useContext(PortalClientContext);
}

export function PortalClientProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await getPortalClientByEmail(slug, email!, token);
        if (!cancelled) setClient(res.data);
      } catch {
        if (!cancelled) setClient(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id, slug]);

  const can = (permission: PortalPermission) =>
    !!client?.portalPermissions?.includes(permission);

  return (
    <PortalClientContext.Provider value={{ client, loading, can }}>
      {children}
    </PortalClientContext.Provider>
  );
}