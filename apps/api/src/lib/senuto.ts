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

  async getVisibility(projectId: string) {
    const url = `${SENUTO_BASE_URL}/rank-tracker/visibility`;
    console.log(`[senuto] GET ${url} project_id=${projectId}`);
    const { data } = await axios.get(url, {
      headers: this.headers,
      params: { project_id: projectId },
    });
    console.log(`[senuto] visibility response:`, JSON.stringify(data).slice(0, 300));
    return data;
  }

  async getKeywordPositions(projectId: string, params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/keywords`, {
      headers: this.headers,
      params: { project_id: projectId, ...params },
    });
    return data;
  }

  async getVisibilityHistory(projectId: string, dateFrom: string, dateTo: string) {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/visibility/history`, {
      headers: this.headers,
      params: { project_id: projectId, date_from: dateFrom, date_to: dateTo },
    });
    return data;
  }

  async getBiggestGainers(projectId: string, limit = 10) {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/keywords/gainers`, {
      headers: this.headers,
      params: { project_id: projectId, limit },
    });
    return data;
  }

  async getBiggestLosers(projectId: string, limit = 10) {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/keywords/losers`, {
      headers: this.headers,
      params: { project_id: projectId, limit },
    });
    return data;
  }

  async getProjects() {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/projects`, {
      headers: this.headers,
    });
    return data;
  }
}

export function getSenutoClient(tenantApiKey?: string | null): SenutoClient {
  const key = tenantApiKey ?? process.env.SENUTO_API_KEY!;
  if (!key) throw new Error("Brak tokena API Senuto");
  return new SenutoClient(key);
}
