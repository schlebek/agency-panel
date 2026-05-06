import axios from "axios";

const SENUTO_BASE_URL = "https://api.senuto.com/api";

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
