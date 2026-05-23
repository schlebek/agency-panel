"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  BrainCircuit, Search, RefreshCw, Sparkles,
  ChevronDown, ChevronUp, AlertCircle, BarChart2,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type AiQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  wordCount: number;
  aiScore: number;
};

type GeminiResult = {
  query: string;
  aiPotential: "wysoki" | "średni" | "niski";
  intent: string;
  suggestion: string;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7 ? "bg-red-50 text-red-600 border-red-100" :
    score >= 5 ? "bg-amber-50 text-amber-600 border-amber-100" :
    "bg-gray-50 text-gray-500 border-gray-100";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function PotentialBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    wysoki: "bg-red-50 text-red-600",
    średni: "bg-amber-50 text-amber-600",
    niski: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[value] ?? "bg-gray-100 text-gray-500"}`}>
      {value}
    </span>
  );
}

export default function AiMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [queries, setQueries] = useState<AiQuery[] | null>(null);
  const [meta, setMeta] = useState<{ dateFrom: string; dateTo: string; totalFetched: number } | null>(null);
  const [analysis, setAnalysis] = useState<GeminiResult[] | null>(null);
  const [minScore, setMinScore] = useState(3);
  const [minWords, setMinWords] = useState(5);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"aiScore" | "impressions" | "clicks">("aiScore");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { data: client } = useSWR(`/clients/${id}`, fetcher);

  const isConnected = client?.hasGscCredentials;
  const hasPropertyUrl = !!client?.gscPropertyUrl;

  async function fetchQueries() {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data } = await api.get(`/ai-monitor/${id}/queries`, {
        params: { minWords, minScore, limit: 100 },
      });
      setQueries(data.queries);
      setMeta({ dateFrom: data.dateFrom, dateTo: data.dateTo, totalFetched: data.totalFetched });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd pobierania danych");
    } finally {
      setLoading(false);
    }
  }

  async function runGeminiAnalysis() {
    if (!queries?.length) return;
    setAnalyzing(true);
    try {
      const top = queries.slice(0, 25).map((q) => q.query);
      const { data } = await api.post(`/ai-monitor/${id}/analyze`, { queries: top });
      setAnalysis(data.analysis);
      toast.success("Analiza AI gotowa");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd analizy Gemini");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  const sorted = queries
    ? [...queries].sort((a, b) => {
        const diff = a[sortBy] - b[sortBy];
        return sortDir === "desc" ? -diff : diff;
      })
    : [];

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Monitor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Wykrywanie zapytań konwersacyjnych i AI-driven z GSC</p>
          </div>
        </div>
        {meta && (
          <p className="text-xs text-gray-400">
            Dane {new Date(meta.dateFrom).toLocaleDateString("pl-PL")}–{new Date(meta.dateTo).toLocaleDateString("pl-PL")}
            {" · "}łącznie {meta.totalFetched} zapytań w GSC
          </p>
        )}
      </div>

      {/* GSC not connected */}
      {!isConnected ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1.5">Google Search Console nie połączone</p>
          <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            Połącz GSC w zakładce <span className="font-medium text-gray-600">Google Search Console</span>,
            a następnie wróć tutaj.
          </p>
          {!hasPropertyUrl && (
            <p className="text-amber-600 text-sm bg-amber-50 px-4 py-2 rounded-lg inline-block">
              Ustaw też URL właściwości GSC w ustawieniach klienta
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Min. słów w zapytaniu
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={3} max={15} value={minWords}
                    onChange={(e) => setMinWords(Number(e.target.value))}
                    className="w-28 accent-violet-600"
                  />
                  <span className="text-sm font-bold text-gray-700 w-4">{minWords}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Min. wynik AI
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={9} value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-28 accent-violet-600"
                  />
                  <span className="text-sm font-bold text-gray-700 w-4">{minScore}</span>
                </div>
              </div>
              <button
                onClick={fetchQueries}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Pobieranie..." : "Pobierz zapytania"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Narzędzie pobiera do 1000 zapytań z GSC (90 dni) i filtruje te, które brzmią jak pytania
              kierowane do AI — długie frazy, pytania naturalne, instrukcje.
            </p>
          </div>

          {/* Results table */}
          {queries !== null && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 mb-5">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Potencjalne prompty AI
                      <span className="ml-2 text-xs font-normal text-gray-400">({queries.length} wyników)</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sortuj po nagłówku · wynik 1–10 (im wyższy, tym bardziej AI-like)
                    </p>
                  </div>
                  {queries.length > 0 && (
                    <button
                      onClick={runGeminiAnalysis}
                      disabled={analyzing}
                      className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-pulse" : ""}`} />
                      {analyzing ? "Analizuję..." : "Analizuj z AI (top 25)"}
                    </button>
                  )}
                </div>

                {queries.length === 0 ? (
                  <div className="p-10 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Brak zapytań spełniających kryteria.</p>
                    <p className="text-xs text-gray-400 mt-1">Spróbuj obniżyć min. słów lub min. wynik AI.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Zapytanie
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Słowa
                          </th>
                          <th
                            className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none"
                            onClick={() => toggleSort("aiScore")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              Wynik AI
                              {sortBy === "aiScore" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                            </span>
                          </th>
                          <th
                            className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none"
                            onClick={() => toggleSort("clicks")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              Kliknięcia
                              {sortBy === "clicks" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                            </span>
                          </th>
                          <th
                            className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none"
                            onClick={() => toggleSort("impressions")}
                          >
                            <span className="flex items-center justify-center gap-1">
                              Wyświetlenia
                              {sortBy === "impressions" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                            </span>
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            CTR
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Pozycja
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sorted.map((q) => (
                          <tr
                            key={q.query}
                            className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                            onClick={() => setExpanded(expanded === q.query ? null : q.query)}
                          >
                            <td className="px-5 py-3">
                              <p className="text-gray-800 font-medium leading-snug max-w-md">{q.query}</p>
                              {expanded === q.query && analysis && (() => {
                                const r = analysis.find((a) => a.query === q.query);
                                if (!r) return null;
                                return (
                                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-indigo-600">Intencja:</span>
                                      <span className="text-xs text-gray-700">{r.intent}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-xs font-medium text-indigo-600 shrink-0">Sugestia:</span>
                                      <span className="text-xs text-gray-700">{r.suggestion}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-gray-500">{q.wordCount}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <ScoreBadge score={q.aiScore} />
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">
                              {formatNumber(q.clicks)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {formatNumber(q.impressions)}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500">
                              {q.ctr ? (q.ctr * 100).toFixed(1) + "%" : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500">
                              {q.avgPosition ? q.avgPosition.toFixed(1) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* AI analysis panel */}
              {analysis && analysis.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2.5 p-5 border-b border-gray-100">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-semibold text-gray-900">Analiza AI</h3>
                    <span className="text-xs text-gray-400">— top {analysis.length} zapytań</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {analysis.map((item, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{item.query}</p>
                          <PotentialBadge value={item.aiPotential} />
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-medium text-gray-600">Intencja: </span>{item.intent}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Sugestia: </span>{item.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis !== null && analysis.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700">Analiza AI nie zwróciła wyników. Spróbuj ponownie.</p>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {queries === null && (
            <div className="space-y-3">
              {/* Hero */}
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 rounded-2xl p-7 text-white">
                <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/5" />
                <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-white/5" />
                <div className="relative">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-3">Jak to działa</p>
                  <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                    Wykrywaj zapytania, które trafiają do Ciebie z AI
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed max-w-lg mb-5">
                    Narzędzie pobiera dane z Twoich integracji, identyfikuje frazy charakterystyczne
                    dla asystentów AI i generuje konkretne rekomendacje optymalizacji treści.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
                      <Search className="w-3 h-3 text-emerald-300" />
                      <span className="text-xs font-medium text-white">Google Search Console</span>
                      <span className="text-[10px] text-white/40">1000 zapytań · 90 dni</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
                      <BarChart2 className="w-3 h-3 text-blue-300" />
                      <span className="text-xs font-medium text-white">Google Analytics</span>
                      <span className="text-[10px] text-white/40">ruch organiczny · sesje</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StepCard
                  step="01"
                  color="emerald"
                  icon={<Search className="w-4 h-4" />}
                  title="Zbieranie danych"
                  items={[
                    "Zapytania z GSC: kliknięcia, wyświetlenia, CTR i pozycja",
                    "Ruch organiczny i sesje z Google Analytics",
                  ]}
                />
                <StepCard
                  step="02"
                  color="violet"
                  icon={<BrainCircuit className="w-4 h-4" />}
                  title="Detekcja AI"
                  items={[
                    "Scoring długości — 5+ słów typowych dla AI",
                    'Frazy jak "jak zrobić", "wyjaśnij", "porównaj"',
                  ]}
                />
                <StepCard
                  step="03"
                  color="indigo"
                  icon={<Sparkles className="w-4 h-4" />}
                  title="Analiza AI"
                  items={[
                    "Ocena intencji użytkownika dla top zapytań",
                    "Sugestia optymalizacji treści pod kątem AI",
                  ]}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STEP_COLORS = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400", num: "text-emerald-100" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  dot: "bg-violet-400",  num: "text-violet-100"  },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  dot: "bg-indigo-400",  num: "text-indigo-100"  },
};

function StepCard({
  step, color, icon, title, items,
}: {
  step: string;
  color: keyof typeof STEP_COLORS;
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  const c = STEP_COLORS[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden group hover:border-gray-200 hover:shadow-sm transition-all">
      <span className={`absolute top-2 right-3 text-5xl font-black select-none leading-none ${c.num}`}>
        {step}
      </span>
      <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center mb-3.5 ${c.text}`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-2.5">{title}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
            <span className="text-xs text-gray-500 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
