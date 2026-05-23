"use client";
import { useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Plus, Send, FileText, X, Download, Loader2 } from "lucide-react";
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

const NOW = new Date();

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    year: NOW.getFullYear(),
    month: NOW.getMonth() + 1,
    notes: "",
    recipientEmail: "",
    templateType: "full" as "full" | "summary" | "branded",
  });

  const { data: reports, mutate } = useSWR(`/reports?clientId=${id}`, fetcher);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/reports", {
        clientId: id,
        year: form.year,
        month: form.month,
        notes: form.notes || undefined,
        recipientEmail: form.recipientEmail || undefined,
        templateType: form.templateType,
      });
      toast.success("Raport w trakcie generowania — zajmie to chwilę");
      setShowForm(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(reportId: string) {
    if (!sendEmail.trim()) { toast.error("Podaj adres email"); return; }
    setSendingId(reportId);
    try {
      await api.post(`/reports/${reportId}/send`, { email: sendEmail });
      toast.success("Raport wysłany");
      setSendEmail("");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd wysyłki");
    } finally {
      setSendingId(null);
    }
  }

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

  const years = Array.from({ length: 3 }, (_, i) => NOW.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Raporty miesięczne</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Generuj raport
        </button>
      </div>

      {!reports ? (
        <div className="text-center text-gray-400 py-8">Ładowanie...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Brak raportów</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Wygeneruj pierwszy raport
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-semibold text-gray-900">{report.title}</h3>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[report.status]}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {getMonthName(report.month)} {report.year}
                    {report.sentAt && ` · Wysłano ${new Date(report.sentAt).toLocaleDateString("pl-PL")}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {report.status === "ready" && (
                    <button
                      onClick={() => handleDownload(report.id, report.title)}
                      disabled={downloadingId === report.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      title="Pobierz PDF"
                    >
                      {downloadingId === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {report.status === "ready" && (
                    <div className="flex gap-2">
                      <input
                        value={sendEmail}
                        onChange={(e) => setSendEmail(e.target.value)}
                        type="email"
                        placeholder="email klienta"
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                      />
                      <button
                        onClick={() => handleSend(report.id)}
                        disabled={sendingId === report.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingId === report.id ? "..." : "Wyślij"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Generuj raport PDF</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Miesiąc</label>
                  <select value={form.month} onChange={(e) => setForm(f => ({ ...f, month: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {months.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rok</label>
                  <select value={form.year} onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email odbiorcy</label>
                <input type="email" value={form.recipientEmail} onChange={(e) => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="klient@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Szablon raportu</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "full", label: "Pełny", desc: "Wszystkie sekcje" },
                    { value: "summary", label: "Skrócony", desc: "Tylko KPI" },
                    { value: "branded", label: "Brandowany", desc: "Z logo agencji" },
                  ].map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, templateType: opt.value as any }))}
                      className={`p-2.5 border rounded-xl text-left transition-colors ${form.templateType === opt.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <p className={`text-xs font-medium ${form.templateType === opt.value ? "text-indigo-700" : "text-gray-700"}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Komentarz do raportu</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Opcjonalny komentarz dla klienta..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading ? "Generowanie..." : "Generuj PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
