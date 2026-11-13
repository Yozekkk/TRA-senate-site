import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { SenateRole } from "../types/database";

type AuthState = {
  session: Session | null;
  role: SenateRole | null;
  loading: boolean;
  canEdit: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<SenateRole | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const update = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) { setRole(null); setLoading(false); return; }
      const { data, error } = await client.from("profiles").select("role").eq("id", next.user.id).maybeSingle();
      if (active) { setRole(error ? null : data?.role ?? "viewer"); setLoading(false); }
    };
    void client.auth.getSession().then(({ data }) => update(data.session)).catch(() => { if (active) setLoading(false); });
    // Defer the profile query until Supabase has released its auth callback lock.
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => { void update(next); }, 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  const value = useMemo<AuthState>(() => ({
    session, role, loading,
    canEdit: role === "chairman" || role === "secretary",
    async signIn(email, password) {
      if (!supabase) throw new Error("Подключение к Supabase ещё не настроено.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
    async requestPasswordReset(email) {
      if (!supabase) throw new Error("Подключение к Supabase ещё не настроено.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("/reset-password", window.location.origin).toString(),
      });
      if (error) throw new Error(error.message);
    },
    async updatePassword(password) {
      if (!supabase) throw new Error("Подключение к Supabase ещё не настроено.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
  }), [session, role, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider is missing");
  return state;
}
