"use client";
import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { FileText, Download, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getMonthName } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const STATUS_LABELS: Record<string, string> = {
  draft: "Szkic",
  generating: "Generowanie...",
  ready: "Gotowy",
  sent: "Wysłany",
  failed: "Błąd",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  generating: "bg-amber-50 text-amber-600",
  ready: "bg-green-50 text-green-600",
  sent: "bg-blue-50 text-blue-600",
  failed: "bg-red-50 text-red-600",
};

export default function ReportsPage() {
  const { data: reports, mutate } = useSWR("/reports", fetcher);
  const { data: clients } = useSWR("/clients", fetcher);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState<Record<string, string>>({});

  const clientMap = Object.fromEntries((clients ?? []).map((c: any) => [c.id, c]));

  async function handleDownload(reportId: string, title: string) {
    setDownloadingId(reportId);
    try {
      const { data } = await api.get(`/reports/${reportId}/download`);
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${title}.pdf`;
      a.click();
    } catch {
      toast.error("Błąd pobierania PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSend(reportId: string) {
    const email = sendEmail[reportId]?.trim();
    if (!email) { toast.error("Podaj adres email"); return; }
    setSendingId(reportId);
    try {
      await api.post(`/reports/${reportId}/send`, { email });
      toast.success("Raport wysłany");
      setSendEmail((prev) => ({ ...prev, [reportId]: "" }));
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd wysyłki");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporty</h1>
        <p className="text-gray-500 text-sm mt-0.5">Wszystkie wygenerowane raporty PDF</p>
      </div>

      {!reports ? (
        <div className="text-center text-gray-400 py-12">Ładowanie...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Brak raportów</p>
          <p className="text-gray-400 text-sm mt-1">Przejdź do wybranego klienta i wygeneruj raport</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {reports.map((report: any) => {
              const client = clientMap[report.clientId];
              return (
                <div key={report.id} className="p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900 truncate">{report.title}</p>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {client && (
                        <Link href={`/clients/${client.id}/reports`} className="hover:text-indigo-600 transition-colors">
                          {client.name}
                        </Link>
                      )}
                      <span>{getMonthName(report.month)} {report.year}</span>
                      {report.sentAt && <span>Wysłano {new Date(report.sentAt).toLocaleDateString("pl-PL")}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {report.status === "ready" && (
                      <>
                        <button
                          onClick={() => handleDownload(report.id, report.title)}
                          disabled={downloadingId === report.id}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Pobierz PDF"
                        >
                          {downloadingId === report.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />
                          }
                        </button>
                        <input
                          value={sendEmail[report.id] ?? ""}
                          onChange={(e) => setSendEmail((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          type="email"
                          placeholder="email klienta"
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
                        />
                        <button
                          onClick={() => handleSend(report.id)}
                          disabled={sendingId === report.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {sendingId === report.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />
                          }
                          Wyślij
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
