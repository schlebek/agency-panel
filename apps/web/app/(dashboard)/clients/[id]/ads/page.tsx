"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart2, Save } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function AdsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, mutate } = useSWR(`/clients/${id}`, fetcher);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (client && !initialized) {
    setNotes(client.adsNotes ?? "");
    setInitialized(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/clients/${id}`, { adsNotes: notes });
      mutate();
      toast.success("Zapisano notatki Ads");
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
            <BarChart2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Google Ads</h1>
            <p className="text-sm text-gray-400">Notatki i obserwacje kampanii</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || !client}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Zapisywanie..." : "Zapisz"}
        </button>
      </div>

      {/* Coming soon info + notes */}
      <div className="grid gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-medium text-amber-800 mb-1">Integracja z Google Ads w przygotowaniu</p>
          <p className="text-sm text-amber-700">Automatyczne pobieranie danych kampanii (ROAS, CPC, konwersje) zostanie dodane w kolejnej wersji. Na razie możesz ręcznie wpisać notatki poniżej.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notatki i obserwacje kampanii Google Ads</label>
          {!client ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              placeholder="Wpisz notatki dotyczące kampanii — budżet, wyniki, obserwacje, rekomendacje..."
              className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          )}
        </div>
      </div>
    </div>
  );
}
