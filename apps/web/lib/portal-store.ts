import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

const portalApi = axios.create({ baseURL: "/api" });

portalApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("portal-token");
    if (token) config.headers["x-client-token"] = token;
  }
  return config;
});

interface ClientAccount {
  id: string;
  email: string;
  name: string;
  clientId: string;
  tenantId: string;
}

interface ClientInfo {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  tabVisibility: Record<string, boolean>;
}

interface AgencyBranding {
  name: string;
  logoUrl: string | null;
  brandColor: string;
}

interface PortalStore {
  token: string | null;
  account: ClientAccount | null;
  client: ClientInfo | null;
  agency: AgencyBranding | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const usePortalStore = create<PortalStore>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      client: null,
      agency: null,
      login: async (email, password) => {
        const { data } = await portalApi.post("/client-portal/login", { email, password });
        localStorage.setItem("portal-token", data.token);
        set({ token: data.token, account: data.account, client: data.client, agency: data.agency ?? null });
      },
      logout: () => {
        portalApi.post("/client-portal/logout").catch(() => {});
        localStorage.removeItem("portal-token");
        set({ token: null, account: null, client: null, agency: null });
      },
      fetchMe: async () => {
        const { data } = await portalApi.get("/client-portal/me");
        set({ account: data.account, client: data.client, agency: data.agency ?? null });
      },
    }),
    { name: "portal-auth", partialize: (s) => ({ token: s.token }) }
  )
);

export { portalApi };
