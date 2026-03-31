import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Branding } from "../types";
import { authApi } from "../services/api";

const DEFAULT_BRANDING: Branding = {
  brand_name: "RecoFace",
  brand_subtitle: "Monitorando vidas",
  brand_logo_url: null,
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  branding: Branding;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshBranding: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("recoface_token"));
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const loadBranding = async () => {
    try {
      const res = await authApi.branding();
      setBranding(res.data);
    } catch {
      setBranding(DEFAULT_BRANDING);
    }
  };

  useEffect(() => {
    if (token) {
      Promise.all([
        authApi.me().then((res) => setUser(res.data)),
        loadBranding(),
      ])
        .catch(() => {
          setToken(null);
          localStorage.removeItem("recoface_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { access_token } = res.data;
    localStorage.setItem("recoface_token", access_token);
    setToken(access_token);
    const meRes = await authApi.me();
    setUser(meRes.data);
    await loadBranding();
  };

  const logout = () => {
    localStorage.removeItem("recoface_token");
    setToken(null);
    setUser(null);
    setBranding(DEFAULT_BRANDING);
  };

  return (
    <AuthContext.Provider value={{ user, token, branding, login, logout, refreshBranding: loadBranding, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
