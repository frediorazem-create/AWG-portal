import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, queryClient } from "./queryClient";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const me = await fetchMe();
    setUser(me);
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
    // Cache nach Login leeren, damit alle Daten frisch geladen werden
    queryClient.clear();
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch {
      // ignore
    }
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: !!user?.isAdmin, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
