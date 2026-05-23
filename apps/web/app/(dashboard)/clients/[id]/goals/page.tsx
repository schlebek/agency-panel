"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target, Save } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const GOAL_FIELDS = [
  { key: "top3Target", label: "TOP 3 — docelowa liczba słów kluczowych", unit: "słów" },
  { key: "top10Target", label: "TOP 10 — docelowa liczba słów kluczowych", unit: "słów" },
  { key: "top50Target", label: "TOP 50 — docelowa liczba słów kluczowych", unit: "słów" },
  { key: "clicksTarget", label: "Kliknięcia miesięczne (GSC)", unit: "kliknięć" },
  { key: "keywordsTarget", label: "Łączna liczba fraz w indeksie", unit: "fraz" },
];

export default function GoalsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: goals, mutate } = useSWR(`/clients/${id}/goals`, fetcher);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goals) {
      const initial: Record<string, string> = {};
      GOAL_FIELDS.forEach((f) => { initial[f.key] = goals[f.key]?.toString() ?? ""; });
      setForm(initial);
    }
  }, [goals]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      GOAL_FIELDS.forEach((f) => {
        const v = parseInt(form[f.key] ?? "");
        if (!isNaN(v) && v >= 0) payload[f.key] = v;
      });
      await api.put(`/clients/${id}/goals`, payload);
      mutate();
      toast.success("Cele zapisane");
    } catch { toast.error("Błąd zapisu"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-4 sm:p-8">
      <Link href={`/clients/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Klient
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cele KPI</h1>
        </div>
        <button onClick={handleSave} disabled={saving || !goals}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Zapisywanie..." : "Zapisz cele"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        {!goals ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Ustaw cele KPI dla klienta. Będą widoczne w raportach i dashboard'zie agencji.</p>
            {GOAL_FIELDS.map((field) => {
              const current = goals[field.key];
              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min="0"
                      value={form[field.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      placeholder="—"
                      className="w-40 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-400">{field.unit}</span>
                    {current !== undefined && current !== null && (
                      <span className="text-xs text-gray-400">Aktualnie: <strong className="text-gray-700">{current.toLocaleString("pl-PL")}</strong></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
