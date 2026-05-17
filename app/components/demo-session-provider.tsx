"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type DemoSessionValue = {
  email: string | null;
  orgId: string | null;
  orgName: string | null;
  loading: boolean;
  signIn: (email: string, orgId: string, orgName: string) => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setEmail(data.email);
        setOrgId(data.orgId);
        setOrgName(data.orgName);
      } else {
        setEmail(null);
        setOrgId(null);
        setOrgName(null);
      }
    } catch (err) {
      console.error("[Session Context] Error loading cookie session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check cookie session on mount once to achieve persistent login on browser refreshes!
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = useCallback((nextEmail: string, nextOrgId: string, nextOrgName: string) => {
    setEmail(nextEmail.trim());
    setOrgId(nextOrgId);
    setOrgName(nextOrgName);
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      setEmail(null);
      setOrgId(null);
      setOrgName(null);
    } catch (err) {
      console.error("[Session Context] Logout error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ email, orgId, orgName, loading, signIn, signOut, refreshSession }),
    [email, orgId, orgName, loading, signIn, signOut, refreshSession]
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return ctx;
}
