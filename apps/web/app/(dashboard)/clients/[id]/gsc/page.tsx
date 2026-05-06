"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Search, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function GscPage() {
  const { id } = useParams<{ id: string }>();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const { data: client } = useSWR(`/clients/${id}`, fetcher);
  const { data: summary, mutate: mutateSummary } = useSWR(`/gsc/${id}/summary`, fetcher);
  const { data: pages } = useSWR(
    summary?.snapshots?.length ? `/gsc/${id}/pages` : null,
    fetcher
  );
  const { data: queries } = useSWR(
    summary?.snapshots?.length ? `/gsc/${id}/queries` : null,
    fetcher
  );

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post(`/gsc/${id}/sync`);
      toast.success("Synchronizacja GSC zaplanowana");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd synchronizacji");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { data } = await api.get(`/gsc/${id}/auth-url`);
      const popup = window.open(data.url, "gsc-auth", "width=600,height=700,left=300,top=100");
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          setConnecting(false);
          mutateSummary();
        }
      }, 1000);
    } catch {
      toast.error("Błąd generowania URL autoryzacji");
      setConnecting(false);
    }
  }

  const latest = summary?.snapshots?.[summary.snapshots.length - 1];
  const isConnected = client?.hasGscCredentials;

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Google Search Console</h2>
        {isConnected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Synchronizuj
          </button>
        )}
      </div>

      {!isConnected ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1.5">Google Search Console nie połączone</p>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Połącz konto Google, aby pobierać dane o kliknięciach i pozycjach z GSC
          </p>
          {!client?.gscPropertyUrl ? (
            <p className="text-amber-600 text-sm bg-amber-50 px-4 py-2 rounded-lg inline-block">
              Najpierw ustaw URL właściwości GSC w ustawieniach klienta (przycisk Edytuj)
            </p>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {connecting ? "Oczekiwanie na autoryzację..." : "Połącz z Google"}
            </button>
          )}
        </div>
      ) : !latest ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-4">Brak danych — kliknij Synchronizuj</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {syncing ? "Synchronizacja..." : "Synchronizuj teraz"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Kliknięcia</p>
              <p className="text-3xl font-bold text-blue-700">{formatNumber(latest.clicks)}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Wyświetlenia</p>
              <p className="text-3xl font-bold text-indigo-700">{formatNumber(latest.impressions)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">CTR</p>
              <p className="text-3xl font-bold text-purple-700">
                {latest.ctr ? (parseFloat(latest.ctr) * 100).toFixed(1) + "%" : "—"}
              </p>
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-2">Śr. pozycja</p>
              <p className="text-3xl font-bold text-cyan-700">
                {latest.avgPosition ? parseFloat(latest.avgPosition).toFixed(1) : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {pages?.pages?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Top strony</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Kliknięcia · Pozycja</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {pages.pages.slice(0, 10).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <p className="flex-1 text-sm text-gray-600 truncate">{p.page}</p>
                      <div className="flex gap-4 flex-shrink-0 text-xs">
                        <span className="font-semibold text-gray-900">{formatNumber(p.clicks)}</span>
                        <span className="text-gray-400">{p.avgPosition ? parseFloat(p.avgPosition).toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {queries?.queries?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Top zapytania</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Kliknięcia · Pozycja</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {queries.queries.slice(0, 10).map((q: any) => (
                    <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                      <p className="flex-1 text-sm font-medium text-gray-900 truncate">{q.query}</p>
                      <div className="flex gap-4 flex-shrink-0 text-xs">
                        <span className="font-semibold text-gray-900">{formatNumber(q.clicks)}</span>
                        <span className="text-gray-400">{q.avgPosition ? parseFloat(q.avgPosition).toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
