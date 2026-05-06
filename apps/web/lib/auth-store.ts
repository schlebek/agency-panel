"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trialEndsAt?: string | null;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { agencyName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("agency_token", data.token);
        set({ user: data.user, tenant: null, token: data.token, isLoading: false });
        await get().fetchMe();
      },

      register: async (body) => {
        set({ isLoading: true });
        const { data } = await api.post("/auth/register", body);
        localStorage.setItem("agency_token", data.token);
        set({ user: data.user, tenant: data.tenant, token: data.token, isLoading: false });
      },

      logout: async () => {
        try { await api.post("/auth/logout"); } catch {}
        localStorage.removeItem("agency_token");
        set({ user: null, tenant: null, token: null });
        window.location.href = "/login";
      },

      fetchMe: async () => {
        const { data } = await api.get("/auth/me");
        set({ user: data.user, tenant: data.tenant });
      },
    }),
    { name: "agency-auth", partialize: (s) => ({ token: s.token }) }
  )
);
