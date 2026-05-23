"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, CheckCircle2, XCircle, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

function StatusDot({ status }: { status: "up" | "down" | "timeout" | "unknown" }) {
  if (status === "up") return <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />;
  if (status === "down") return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />;
}

export default function UptimePage() {
  const { id } = useParams<{ id: string }>();
  const { data, mutate } = useSWR(`/clients/${id}/uptime`, fetcher, { refreshInterval: 30000 });
  const [toggling, setToggling] = useState(false);

  async function toggle() {
    setToggling(true);
    try {
      await api.patch(`/clients/${id}/uptime/toggle`);
      mutate();
      toast.success("Status monitoringu zmieniony");
    } catch { toast.error("Błąd"); }
    finally { setToggling(false); }
  }

  if (!data) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statusColor = data.status === "up" ? "text-green-600" : data.status === "down" ? "text-red-600" : "text-gray-400";
  const StatusIcon = data.status === "up" ? Wifi : data.status === "down" ? WifiOff : Clock;

  return (
    <div className="p-4 sm:p-8">
      <Link href={`/clients/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Klient
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Monitoring uptime</h1>
            <p className="text-sm text-gray-400">{data.domain}</p>
          </div>
        </div>
        <button onClick={toggle} disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${data.enabled ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
          {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          {data.enabled ? "Wyłącz monitoring" : "Włącz monitoring"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <div className={`flex items-center gap-2 text-lg font-bold ${statusColor}`}>
            <StatusIcon className="w-5 h-5" />
            {data.status === "up" ? "Dostępny" : data.status === "down" ? "Niedostępny" : "Nieznany"}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Uptime (7 dni)</p>
          <p className="text-2xl font-bold text-gray-900">{data.uptimePct !== null ? `${data.uptimePct}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Śr. czas odpowiedzi</p>
          <p className="text-2xl font-bold text-gray-900">{data.avgResponseMs !== null ? `${data.avgResponseMs}ms` : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-1">Sprawdzeń (7 dni)</p>
          <p className="text-2xl font-bold text-gray-900">{data.checks?.length ?? 0}</p>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Historia ostatnich 7 dni</h2>
        {!data.enabled ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Monitoring jest wyłączony. Włącz go aby zbierać dane.
          </div>
        ) : data.checks?.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            Brak danych — monitoring uruchomi się wkrótce.
          </div>
        ) : (
          <>
            {/* Sparkline bar */}
            <div className="flex gap-0.5 mb-4 h-8 items-end">
              {(data.checks ?? []).slice(0, 100).reverse().map((c: any, i: number) => (
                <div key={i} title={`${new Date(c.checkedAt).toLocaleString("pl-PL")} — ${c.status} ${c.responseTimeMs ? `(${c.responseTimeMs}ms)` : ""}`}
                  className={`flex-1 min-w-[2px] rounded-sm ${c.status === "up" ? "bg-green-400" : c.status === "down" ? "bg-red-400" : "bg-gray-200"}`}
                  style={{ height: c.responseTimeMs ? `${Math.min(100, (c.responseTimeMs / 2000) * 100)}%` : "30%" }}
                />
              ))}
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {data.checks.slice(0, 50).map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <StatusDot status={c.status} />
                  <span className="text-gray-400 text-xs w-36 flex-shrink-0">
                    {new Date(c.checkedAt).toLocaleString("pl-PL", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${c.status === "up" ? "bg-green-50 text-green-600" : c.status === "down" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                    {c.status === "up" ? "UP" : c.status === "down" ? "DOWN" : "TIMEOUT"}
                  </span>
                  {c.statusCode && <span className="text-gray-400 text-xs">HTTP {c.statusCode}</span>}
                  {c.responseTimeMs && <span className="text-gray-400 text-xs">{c.responseTimeMs}ms</span>}
                  {c.errorMessage && <span className="text-red-400 text-xs truncate">{c.errorMessage}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
