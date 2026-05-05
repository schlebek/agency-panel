"use client";
import { useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Plus, X, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getMonthName } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const TYPE_LABELS: Record<string, string> = {
  optimization: "Optymalizacja",
  text: "Tekst",
  brief: "Brief",
  link_building: "Link Building",
  technical: "Techniczne",
  other: "Inne",
};

const TYPE_COLORS: Record<string, string> = {
  optimization: "bg-indigo-50 text-indigo-700",
  text: "bg-green-50 text-green-700",
  brief: "bg-purple-50 text-purple-700",
  link_building: "bg-orange-50 text-orange-700",
  technical: "bg-gray-100 text-gray-700",
  other: "bg-gray-50 text-gray-600",
};

const NOW = new Date();

export default function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "optimization",
    title: "",
    content: "",
    url: "",
  });

  const { data, mutate } = useSWR(`/notes?clientId=${id}&year=${year}&month=${month}`, fetcher);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { clientId: id, year, month, ...form, url: form.url || undefined };
      await api.post("/notes", payload);
      toast.success("Dodano wpis");
      setForm({ type: "optimization", title: "", content: "", url: "" });
      setShowForm(false);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await api.delete(`/notes/${noteId}`);
      toast.success("Usunięto wpis");
      mutate();
    } catch {
      toast.error("Błąd usuwania");
    }
  }

  const years = Array.from({ length: 3 }, (_, i) => NOW.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Wykonane prace</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Dodaj wpis
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-3 mb-6">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {months.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Notes list */}
      {!data ? (
        <div className="text-center text-gray-400 py-8">Ładowanie...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileEdit className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Brak wpisów za {getMonthName(month)} {year}</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Dodaj pierwszy wpis
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((note: any) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${TYPE_COLORS[note.type]}`}>
                    {TYPE_LABELS[note.type]}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{note.title}</p>
                    {note.content && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{note.content}</p>}
                    {note.url && (
                      <a href={note.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 mt-1.5 block break-all">
                        {note.url}
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(note.id)}
                  className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Dodaj wpis — {getMonthName(month)} {year}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Typ</label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tytuł *</label>
                <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  required className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Np. Optymalizacja meta tagów" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Opis</label>
                <textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={3} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Opis wykonanej pracy..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL (opcjonalnie)</label>
                <input value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                  type="url" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading ? "Dodawanie..." : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
