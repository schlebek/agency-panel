"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

function PositionBadge({ change }: { change: number | null | undefined }) {
  if (change == null || change === 0) return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  if (change > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
      <ArrowUp className="w-3 h-3" />+{change}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
      <ArrowDown className="w-3 h-3" />{change}
    </span>
  );
}

function formatPln(val: string | number | null | undefined): string {
  if (val == null) return "—";
  const n = Number(val);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1000) return `${Math.round(n / 1000)} tys. zł`;
  return `${n.toFixed(0)} zł`;
}

export default function SeoPage() {
  const { id } = useParams<{ id: string }>();
  const [syncing, setSyncing] = useState(false);

  const { data: visibility } = useSWR(`/senuto/${id}/visibility`, fetcher);
  const { data: gainers } = useSWR(`/senuto/${id}/gainers`, fetcher);
  const { data: losers } = useSWR(`/senuto/${id}/losers`, fetcher);
  const { data: keywords } = useSWR(`/senuto/${id}/keywords?limit=100`, fetcher);
  const { data: competitorsData } = useSWR(`/senuto/${id}/competitors`, fetcher);

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post(`/senuto/${id}/sync`);
      toast.success("Synchronizacja zaplanowana — dane zaktualizują się za chwilę");
    } catch {
      toast.error("Błąd synchronizacji");
    } finally {
      setSyncing(false);
    }
  }

  const chartData = visibility?.snapshots?.map((s: any) => ({
    date: new Date(s.snapshotDate).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
    "TOP 3": s.top3,
    "TOP 10": s.top10,
    "TOP 50": s.top50,
  })) ?? [];

  const latest = visibility?.snapshots?.[visibility.snapshots.length - 1];
  const prev = visibility?.snapshots?.[visibility.snapshots.length - 2];

  const kwList: any[] = keywords?.keywords ?? [];
  const competitors: any[] = competitorsData?.competitors ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Widoczność SEO (Senuto)</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          Synchronizuj
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "TOP 3", key: "top3", color: "indigo" },
          { label: "TOP 10", key: "top10", color: "blue" },
          { label: "TOP 50", key: "top50", color: "cyan" },
        ].map(({ label, key, color }) => {
          const val = latest?.[key];
          const prevVal = prev?.[key];
          const diff = val != null && prevVal != null ? val - prevVal : null;
          return (
            <div key={key} className={`bg-${color}-50 border border-${color}-100 rounded-2xl p-5`}>
              <p className={`text-xs font-semibold text-${color}-500 uppercase tracking-wider mb-2`}>{label}</p>
              <p className={`text-3xl font-bold text-${color}-700`}>{formatNumber(val)}</p>
              {diff != null && (
                <div className="flex items-center gap-1 mt-1.5">
                  {diff > 0 ? <ArrowUp className="w-3.5 h-3.5 text-green-600" /> : diff < 0 ? <ArrowDown className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5 text-gray-400" />}
                  <span className={`text-xs font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {diff > 0 ? "+" : ""}{diff} vs poprzedni
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ads equivalent + visibility score */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Ekwiwalent Google Ads</p>
          <p className="text-3xl font-bold text-amber-700">{formatPln(latest?.adsEquivalent)}</p>
          <p className="text-xs text-amber-500 mt-1.5">Szacowana wartość ruchu organicznego</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Indeks widoczności</p>
          <p className="text-3xl font-bold text-green-700">
            {latest?.visibilityScore ? formatNumber(Math.round(Number(latest.visibilityScore))) : "—"}
          </p>
          <p className="text-xs text-green-500 mt-1.5">Widoczność organiczna wg Senuto</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Historia widoczności</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="TOP 3" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TOP 10" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TOP 50" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gainers & Losers */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-900">Największe wzrosty</h3>
          </div>
          <div className="space-y-2">
            {kwList.filter(k => (k.positionChange ?? 0) > 0).slice(0, 10).length > 0
              ? kwList.filter(k => (k.positionChange ?? 0) > 0).sort((a, b) => (b.positionChange ?? 0) - (a.positionChange ?? 0)).slice(0, 10).map((kw: any) => (
                <div key={kw.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{kw.keyword}</p>
                    <p className="text-xs text-gray-400">Poz. {kw.position}{kw.searchVolume ? ` · ${formatNumber(kw.searchVolume)}/mies.` : ""}</p>
                  </div>
                  <PositionBadge change={kw.positionChange} />
                </div>
              ))
              : <p className="text-sm text-gray-400 py-4 text-center">Brak danych</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-gray-900">Największe spadki</h3>
          </div>
          <div className="space-y-2">
            {kwList.filter(k => (k.positionChange ?? 0) < 0).slice(0, 10).length > 0
              ? kwList.filter(k => (k.positionChange ?? 0) < 0).sort((a, b) => (a.positionChange ?? 0) - (b.positionChange ?? 0)).slice(0, 10).map((kw: any) => (
                <div key={kw.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{kw.keyword}</p>
                    <p className="text-xs text-gray-400">Poz. {kw.position}{kw.searchVolume ? ` · ${formatNumber(kw.searchVolume)}/mies.` : ""}</p>
                  </div>
                  <PositionBadge change={kw.positionChange} />
                </div>
              ))
              : <p className="text-sm text-gray-400 py-4 text-center">Brak danych</p>}
          </div>
        </div>
      </div>

      {/* Competitors */}
      {competitors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Konkurencja w wynikach organicznych</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Domena</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wspólne frazy</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">TOP 10</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">TOP 50</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Widoczność</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {competitors.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900">
                      <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                        {c.domain}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-700">{formatNumber(c.commonKeywords)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(c.keywordsTop10)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(c.keywordsTop50)}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(c.visibilityIndex ? Math.round(Number(c.visibilityIndex)) : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keywords table - show if data available, otherwise info box */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Ranking słów kluczowych</h3>
          {kwList.length > 0 && <span className="text-xs text-gray-400">{kwList.length} fraz</span>}
        </div>
        {kwList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fraza</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pozycja</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zmiana</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wolumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kwList.map((kw: any) => (
                  <tr key={kw.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900 max-w-xs truncate">
                      {kw.url
                        ? <a href={kw.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">{kw.keyword}</a>
                        : kw.keyword}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700 font-semibold">{kw.position ?? "—"}</td>
                    <td className="py-3 px-4 text-right"><PositionBadge change={kw.positionChange} /></td>
                    <td className="py-3 px-4 text-right text-gray-500">{formatNumber(kw.searchVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 mb-1">Dane pozycji fraz kluczowych nie są dostępne przez Senuto Visibility Analysis API.</p>
            <p className="text-xs text-gray-400">Widoczność, konkurencja i ekwiwalent Google Ads pobierane są automatycznie co 24h.</p>
          </div>
        )}
      </div>
    </div>
  );
}
