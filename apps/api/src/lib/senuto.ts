import axios from "axios";
import { db, tenants } from "@agency/db";
import { eq } from "drizzle-orm";

const SENUTO_BASE_URL = "https://api.senuto.com/api";

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export async function ensureValidSenutoToken(tenantId: string, currentToken: string): Promise<string> {
  const exp = decodeJwtExpiry(currentToken);
  const sevenDaysFromNow = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

  if (exp && exp > sevenDaysFromNow) {
    return currentToken;
  }

  const email = process.env.SENUTO_EMAIL;
  const password = process.env.SENUTO_PASSWORD;
  if (!email || !password) {
    console.warn("[senuto] Token expiring but SENUTO_EMAIL/SENUTO_PASSWORD not set — skipping renewal");
    return currentToken;
  }

  console.log("[senuto] Token expiring soon — refreshing...");
  const newToken = await SenutoClient.authenticate(email, password);
  await db.update(tenants).set({ senutoApiKey: newToken }).where(eq(tenants.id, tenantId));
  console.log("[senuto] Token refreshed and saved to DB");
  return newToken;
}

export class SenutoClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      "Lang": "pl-PL",
    };
  }

  static async authenticate(email: string, password: string): Promise<string> {
    try {
      const { data } = await axios.post(`${SENUTO_BASE_URL}/users/token`, { email, password }, {
        headers: { "Content-Type": "application/json", "Lang": "pl-PL" },
      });
      const token = data?.data?.token;
      if (!token) throw new Error("Brak tokena w odpowiedzi: " + JSON.stringify(data));
      return token;
    } catch (err: any) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error("[senuto] auth error:", err.response?.status, msg);
      throw new Error(msg);
    }
  }

  async getPositionsHistory(domain: string, params?: {
    dateMin?: string;
    dateMax?: string;
    countryId?: number;
    dateInterval?: "daily" | "weekly";
  }) {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const qs = new URLSearchParams({
      domain,
      fetch_mode: "topLevelDomain",
      country_id: String(params?.countryId ?? 1),
      date_min: params?.dateMin ?? thirtyDaysAgo,
      date_max: params?.dateMax ?? today,
      date_interval: params?.dateInterval ?? "daily",
    });

    const url = `${SENUTO_BASE_URL}/visibility_analysis/reports/domain_positions/getPositionsHistoryChartDataForAllTypes?${qs}`;
    console.log("[senuto] GET positions history for:", domain);

    try {
      const { data } = await axios.get(url, { headers: this.headers });
      console.log("[senuto] positions response:", JSON.stringify(data).slice(0, 300));
      return data;
    } catch (err: any) {
      console.error("[senuto] error", err.response?.status, JSON.stringify(err.response?.data));
      throw err;
    }
  }
}

export function getSenutoClient(tenantApiKey?: string | null): SenutoClient {
  const key = tenantApiKey ?? process.env.SENUTO_API_KEY!;
  if (!key) throw new Error("Brak tokena API Senuto");
  return new SenutoClient(key);
}
