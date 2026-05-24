import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  withCredentials: true,
});

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("agency-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    }
  } catch {}
  // legacy fallback
  return localStorage.getItem("agency_token");
}

function clearStoredToken() {
  localStorage.removeItem("agency_token");
  try {
    const raw = localStorage.getItem("agency-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state.token = null;
        localStorage.setItem("agency-auth", JSON.stringify(parsed));
      }
    }
  } catch {}
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      clearStoredToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
