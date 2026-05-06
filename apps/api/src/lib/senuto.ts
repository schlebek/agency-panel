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
    };
  }

  static async authenticate(email: string, password: string): Promise<string> {
    try {
      const { data } = await axios.post(`${SENUTO_BASE_URL}/users/token`, { email, password }, {
        headers: { "Content-Type": "application/json" },
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

  async getVisibilityKeywords(domain: string, params?: {
    dateMin?: string;
    dateMax?: string;
    countryId?: number;
    limit?: number;
    page?: number;
  }) {
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const body = {
      domain,
      date_min: params?.dateMin ?? sevenDaysAgo,
      date_max: params?.dateMax ?? today,
      country_id: params?.countryId ?? 105,
      fetch_mode: 1,
      limit: params?.limit ?? 500,
      page: params?.page ?? 1,
      order: { column: "position", dir: "asc" },
      days_compare_mode: 7,
      isDataReadyToLoad: true,
    };

    console.log("[senuto] POST visibility_analysis/reports/history/keywords/getData", domain, body);

    const { data } = await axios.post(
      `${SENUTO_BASE_URL}/visibility_analysis/reports/history/keywords/getData`,
      body,
      { headers: this.headers }
    );

    console.log("[senuto] keywords response:", JSON.stringify(data).slice(0, 300));
    return data;
  }
}

export function getSenutoClient(tenantApiKey?: string | null): SenutoClient {
  const key = tenantApiKey ?? process.env.SENUTO_API_KEY!;
  if (!key) throw new Error("Brak tokena API Senuto");
  return new SenutoClient(key);
}
