import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dbCurrentAccount, dbSignOut, type LocalAccount } from "@/lib/local-db";

interface AuthContextValue {
  user: LocalAccount | null;
  session: { user: LocalAccount } | null;
  loading: boolean;
  signOut: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(dbCurrentAccount());
    setLoading(false);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "wf-session") setUser(dbCurrentAccount());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function signOut() {
    dbSignOut();
    setUser(null);
  }

  function refresh() {
    setUser(dbCurrentAccount());
  }

  return (
    <AuthContext.Provider value={{ user, session: user ? { user } : null, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
