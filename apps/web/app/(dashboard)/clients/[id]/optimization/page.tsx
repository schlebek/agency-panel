"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CheckSquare, Square, Zap } from "lucide-react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const CHECKLIST_ITEMS = [
  { key: "ssl", label: "Weryfikacja SSL i przekierowań z HTTP na HTTPS" },
  { key: "friendly_urls", label: "Ustawienie przyjaznych linków (permalink)" },
  { key: "rank_math", label: "Konfiguracja wtyczki Rank Math SEO" },
  { key: "indexation", label: "Konfiguracja indeksacji — wykluczenie autorów, tagów, archiwów, kategorii" },
  { key: "alt_title", label: "Uzupełnienie atrybutów alt i title dla obrazków" },
  { key: "sitemap", label: "Utworzenie mapy strony (sitemap.xml)" },
  { key: "robots", label: "Poprawienie pliku robots.txt i dodanie linku do sitemapy" },
  { key: "schema", label: "Uzupełnienie danych strukturalnych schema.org" },
  { key: "nofollow", label: 'Dodanie atrybutów rel="nofollow" i target="_blank" dla linków wychodzących' },
  { key: "meta", label: "Uzupełnienie Title i Meta Description" },
  { key: "headings", label: "Weryfikacja nagłówków Hx na stronie" },
  { key: "cache", label: "Optymalizacja szybkości — włączenie cachowania" },
  { key: "webp", label: "Konwersja grafik do formatu .webp i uruchomienie lazy loading" },
  { key: "canonical", label: "Poprawienie linków kanonicznych" },
  { key: "minification", label: "Weryfikacja minifikacji JS (czy nie psuje elementów na stronie)" },
] as const;

export default function OptimizationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, mutate } = useSWR(`/clients/${id}`, fetcher);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client?.optimizationChecklist) {
      setChecklist(client.optimizationChecklist);
    }
  }, [client]);

  async function toggle(key: string) {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    setSaving(true);
    try {
      await api.patch(`/clients/${id}/optimization`, { checklist: updated });
      mutate();
    } catch {
      toast.error("Błąd zapisu");
      setChecklist(checklist);
    } finally {
      setSaving(false);
    }
  }

  const done = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const total = CHECKLIST_ITEMS.length;
  const percent = Math.round((done / total) * 100);

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Optymalizacja SEO</h2>
          <p className="text-sm text-gray-400 mt-0.5">Lista prac do wykonania przy wdrożeniu</p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-gray-400">Zapisywanie...</span>}
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{done}/{total}</p>
            <p className="text-xs text-gray-400">ukończone</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Postęp wdrożenia</span>
          <span className="text-sm font-bold text-indigo-600">{percent}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {percent === 100 && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Wszystkie prace ukończone!
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {CHECKLIST_ITEMS.map((item, idx) => {
          const checked = !!checklist[item.key];
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors group first:rounded-t-2xl last:rounded-b-2xl"
            >
              <span className="flex-shrink-0">
                {checked ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                )}
              </span>
              <span className={`text-sm transition-colors ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>
                <span className="text-gray-300 text-xs mr-2 font-mono">{String(idx + 1).padStart(2, "0")}</span>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
