import axios from "axios";

const SENUTO_BASE_URL = "https://api.senuto.com/v1";

export class SenutoClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async getVisibility(projectId: string) {
    const { data } = await axios.get(`${SENUTO_BASE_URL}/rank-tracker/visibility`, {
      headers: this.headers,
      params: { project_id: projectId },
    });
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
  if (!key) throw new Error("Brak klucza API Senuto");
  return new SenutoClient(key);
}
