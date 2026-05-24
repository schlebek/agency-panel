"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { usePortalStore, portalApi } from "@/lib/portal-store";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Globe, LogOut, CheckSquare, Square, BookOpen, Link2,
  FileEdit, CheckCircle2, Clock, Send, ExternalLink, ChevronDown, ChevronUp,
  BarChart3, Zap, FileText, TrendingDown, Minus, Search, MousePointerClick,
  Eye, ChevronLeft, ChevronRight, MessageCircle,
} from "lucide-react";

const portalFetcher = (url: string) => portalApi.get(url).then((r) => r.data);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0) {
  if (n == null) return "—";
  return n.toLocaleString("pl-PL", { maximumFractionDigits: decimals });
}

function pct(n: number | null | undefined) {
  if (n == null) return "—";
  return (n * 100).toFixed(1) + "%";
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return date.toLocaleDateString("pl-PL", { month: "short", year: "numeric" });
}

function generateMonths(count = 12): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().substring(0, 7));
  }
  return months;
}

function calcChange(current: number | null | undefined, prev: number | null | undefined) {
  if (current == null || prev == null || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

// ─── Components ───────────────────────────────────────────────────────────────

function ChangeChip({ value, inverted = false }: { value: number | null; inverted?: boolean }) {
  if (value == null) return <span className="text-xs text-gray-300">brak danych</span>;
  const positive = inverted ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.1;
  if (neutral) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus className="w-3 h-3" />0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, prev, yearAgo, color = "indigo", icon: Icon, suffix = "" }: any) {
  const vsPrev = calcChange(value, prev);
  const vsYear = calcChange(value, yearAgo);
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] ?? colors.indigo}`}>
          <Icon className="w-4 h-4" />
        </div>
        <ChangeChip value={vsPrev} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value != null ? fmt(value) + suffix : "—"}</p>
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {vsYear != null && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>r/r:</span>
          <ChangeChip value={vsYear} />
        </div>
      )}
    </div>
  );
}

const CHECKLIST_ITEMS = [
  { key: "ssl", label: "Weryfikacja SSL i przekierowania HTTPS" },
  { key: "friendly_urls", label: "Przyjazne linki (permalink)" },
  { key: "rank_math", label: "Konfiguracja Rank Math SEO" },
  { key: "indexation", label: "Konfiguracja indeksacji" },
  { key: "alt_title", label: "Alt i title dla obrazków" },
  { key: "sitemap", label: "Mapa strony (sitemap.xml)" },
  { key: "robots", label: "Plik robots.txt" },
  { key: "schema", label: "Dane strukturalne schema.org" },
  { key: "nofollow", label: "Atrybuty nofollow dla linków" },
  { key: "meta", label: "Title i Meta Description" },
  { key: "headings", label: "Nagłówki Hx na stronie" },
  { key: "cache", label: "Cachowanie (szybkość)" },
  { key: "webp", label: "Grafiki .webp + lazy loading" },
  { key: "canonical", label: "Linki kanoniczne" },
  { key: "minification", label: "Minifikacja JS" },
];

const STATUS_CONFIG = {
  pending: { label: "Oczekuje", icon: Clock, cls: "text-amber-600 bg-amber-50" },
  sent: { label: "Przesłany", icon: Send, cls: "text-blue-600 bg-blue-50" },
  published: { label: "Opublikowany", icon: CheckCircle2, cls: "text-green-600 bg-green-50" },
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  optimization: "Optymalizacja", text: "Tekst", brief: "Brief",
  link_building: "Link building", technical: "Techniczne", other: "Inne",
};

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, badge }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((o: boolean) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-indigo-500" />
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
          {badge != null && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  );
}

function MonthSelector({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const months = useMemo(() => generateMonths(12), []);
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
      <button onClick={() => {
        const idx = months.indexOf(value);
        if (idx > 0) onChange(months[idx - 1]);
      }} className="p-0.5 hover:text-indigo-600 text-gray-400 transition-colors disabled:opacity-30"
        disabled={months.indexOf(value) === 0}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer px-1"
      >
        {months.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}</option>
        ))}
      </select>
      <button onClick={() => {
        const idx = months.indexOf(value);
        if (idx < months.length - 1) onChange(months[idx + 1]);
      }} className="p-0.5 hover:text-indigo-600 text-gray-400 transition-colors disabled:opacity-30"
        disabled={months.indexOf(value) === months.length - 1}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

const CHART_COLORS = {
  top3: "#6366f1",
  top10: "#8b5cf6",
  top50: "#a78bfa",
  clicks: "#10b981",
  impressions: "#6ee7b7",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{monthLabel(label)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">{p.value?.toLocaleString("pl-PL")}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PortalDashboard() {
  const router = useRouter();
  const { account, client, agency, logout } = usePortalStore();

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const { data: portalData, isLoading } = useSWR("/client-portal/data", portalFetcher);
  const { data: seoHistory } = useSWR("/client-portal/seo-history", portalFetcher);
  const { data: gscHistory } = useSWR("/client-portal/gsc-history", portalFetcher);
  const { data: gscData } = useSWR(`/client-portal/gsc-data?month=${selectedMonth}`, portalFetcher);
  const { data: comments, mutate: mutateComments } = useSWR("/client-portal/comments", portalFetcher);

  useEffect(() => {
    if (!account) router.push("/portal/login");
  }, [account]);

  if (!account || !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const checklist = (client as any).optimizationChecklist ?? {};
  const tabVis: Record<string, boolean> = client.tabVisibility ?? {};

  const notes = portalData?.notes ?? [];
  const briefs = portalData?.briefs ?? [];
  const links = portalData?.links ?? [];

  const doneCount = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const totalCount = CHECKLIST_ITEMS.length;

  // SEO: get current and previous month from history
  const seoHist: any[] = seoHistory?.history ?? [];
  const seoCurrentIdx = seoHist.findIndex((h: any) => h.month === selectedMonth);
  const seoCurrent = seoCurrentIdx >= 0 ? seoHist[seoCurrentIdx] : seoHist[seoHist.length - 1] ?? null;
  const seoPrev = seoCurrentIdx > 0 ? seoHist[seoCurrentIdx - 1] : seoHist[seoHist.length - 2] ?? null;

  // Find year-ago in SEO history
  const [sy, sm] = selectedMonth.split("-").map(Number);
  const yearAgoMonth = `${sy - 1}-${String(sm).padStart(2, "0")}`;
  const seoYearAgo = seoHist.find((h: any) => h.month === yearAgoMonth) ?? null;

  // GSC
  const gsc = gscData ?? null;

  function handleLogout() {
    logout();
    router.push("/portal/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agency?.logoUrl ? (
              <img src={agency.logoUrl} alt={agency.name} className="h-8 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: agency?.brandColor ?? "#4F46E5" }}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{agency?.name ?? client.name}</p>
              <p className="text-xs text-gray-400">{client.domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{account.name}</p>
              <p className="text-xs text-gray-400">{account.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Wyloguj</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 space-y-6">

        {/* Welcome + month selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Cześć, {account.name.split(" ")[0]}!
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Analityka SEO dla {client.name}</p>
          </div>
          {(tabVis.seo !== false || tabVis.gsc !== false) && (
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          )}
        </div>

        {/* ── SEO Widoczność (Senuto) ── */}
        {tabVis.seo !== false && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-indigo-600 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Widoczność SEO</h2>
              <span className="text-xs text-gray-400">{monthLabel(selectedMonth)}</span>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard
                icon={TrendingUp} label="Frazy w TOP 3" color="indigo"
                value={seoCurrent?.top3} prev={seoPrev?.top3} yearAgo={seoYearAgo?.top3}
              />
              <KpiCard
                icon={BarChart3} label="Frazy w TOP 10" color="purple"
                value={seoCurrent?.top10} prev={seoPrev?.top10} yearAgo={seoYearAgo?.top10}
              />
              <KpiCard
                icon={FileText} label="Frazy w TOP 50" color="blue"
                value={seoCurrent?.top50} prev={seoPrev?.top50} yearAgo={seoYearAgo?.top50}
              />
            </div>

            {/* Visibility chart */}
            {seoHist.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-900 mb-4">Historia widoczności — TOP 3 / 10 / 50</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={seoHist} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="top3" name="TOP 3" stroke={CHART_COLORS.top3} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="top10" name="TOP 10" stroke={CHART_COLORS.top10} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="top50" name="TOP 50" stroke={CHART_COLORS.top50} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── GSC Ruch Organiczny ── */}
        {tabVis.gsc !== false && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-emerald-600 rounded-full" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Ruch Organiczny (GSC)</h2>
              <span className="text-xs text-gray-400">{monthLabel(selectedMonth)}</span>
            </div>

            {gsc?.current ? (
              <>
                {/* GSC KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard
                    icon={MousePointerClick} label="Kliknięcia" color="green"
                    value={gsc.current?.clicks} prev={gsc.previous?.clicks} yearAgo={gsc.yearAgo?.clicks}
                  />
                  <KpiCard
                    icon={Eye} label="Wyświetlenia" color="blue"
                    value={gsc.current?.impressions} prev={gsc.previous?.impressions} yearAgo={gsc.yearAgo?.impressions}
                  />
                  <KpiCard
                    icon={BarChart3} label="CTR" color="amber"
                    value={gsc.current?.ctr != null ? +(gsc.current.ctr * 100).toFixed(1) : null}
                    prev={gsc.previous?.ctr != null ? +(gsc.previous.ctr * 100).toFixed(1) : null}
                    yearAgo={gsc.yearAgo?.ctr != null ? +(gsc.yearAgo.ctr * 100).toFixed(1) : null}
                    suffix="%"
                  />
                  <KpiCard
                    icon={TrendingUp} label="Śr. pozycja" color="purple" inverted
                    value={gsc.current?.avgPosition != null ? +gsc.current.avgPosition.toFixed(1) : null}
                    prev={gsc.previous?.avgPosition != null ? +gsc.previous.avgPosition.toFixed(1) : null}
                    yearAgo={gsc.yearAgo?.avgPosition != null ? +gsc.yearAgo.avgPosition.toFixed(1) : null}
                  />
                </div>

                {/* Traffic chart */}
                {(gscHistory?.history?.length ?? 0) > 1 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-sm font-semibold text-gray-900 mb-4">Historia ruchu organicznego</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={gscHistory.history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.clicks} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={CHART_COLORS.clicks} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.impressions} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={CHART_COLORS.impressions} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area type="monotone" dataKey="clicks" name="Kliknięcia" stroke={CHART_COLORS.clicks} fill="url(#gClicks)" strokeWidth={2} dot={false} />
                        <Area type="monotone" dataKey="impressions" name="Wyświetlenia" stroke={CHART_COLORS.impressions} fill="url(#gImpr)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Queries + Pages */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {gsc.queries?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-indigo-500" />
                        <p className="text-sm font-semibold text-gray-900">Najczęstsze zapytania</p>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {gsc.queries.map((q: any, i: number) => (
                          <div key={i} className="px-5 py-3 flex items-center gap-3">
                            <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{q.query}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 text-right">
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{fmt(q.clicks)}</p>
                                <p className="text-xs text-gray-400">klik.</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-xs font-semibold text-gray-500">{fmt(q.impressions)}</p>
                                <p className="text-xs text-gray-400">wyśw.</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-xs font-semibold text-gray-500">{q.avgPosition?.toFixed(1)}</p>
                                <p className="text-xs text-gray-400">poz.</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {gsc.pages?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm font-semibold text-gray-900">Najpopularniejsze strony</p>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {gsc.pages.map((p: any, i: number) => (
                          <div key={i} className="px-5 py-3 flex items-center gap-3">
                            <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <a href={p.page} target="_blank" rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-800 truncate block transition-colors">
                                {p.page.replace(/^https?:\/\/[^/]+/, "") || "/"}
                              </a>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 text-right">
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{fmt(p.clicks)}</p>
                                <p className="text-xs text-gray-400">klik.</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-xs font-semibold text-gray-500">{fmt(p.impressions)}</p>
                                <p className="text-xs text-gray-400">wyśw.</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 px-6 py-10 text-center">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Brak danych GSC dla tego miesiąca</p>
                <p className="text-xs text-gray-300 mt-1">Dane pojawią się po synchronizacji z Google Search Console</p>
              </div>
            )}
          </div>
        )}

        {/* ── Inne sekcje ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* Optymalizacja SEO */}
            {tabVis.optimization !== false && (
              <CollapsibleSection title="Optymalizacja SEO" icon={CheckSquare}
                badge={`${doneCount}/${totalCount}`} defaultOpen={false}>
                <div className="px-6 py-4 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Postęp wdrożenia</span>
                    <span className="text-xs font-bold text-indigo-600">
                      {Math.round((doneCount / totalCount) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                    />
                  </div>
                  {doneCount === totalCount && (
                    <div className="flex items-center gap-1.5 mt-2 text-green-600 text-xs font-medium">
                      <Zap className="w-3.5 h-3.5" />Wszystkie prace ukończone!
                    </div>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {CHECKLIST_ITEMS.map((item) => {
                    const done = !!checklist[item.key];
                    return (
                      <div key={item.key} className="flex items-center gap-3 px-6 py-3">
                        {done
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-gray-200 flex-shrink-0" />}
                        <span className={`text-sm ${done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Prace wykonane */}
            {tabVis.notes !== false && notes.length > 0 && (
              <CollapsibleSection title="Wykonane prace" icon={FileEdit} badge={notes.length} defaultOpen={false}>
                <div className="divide-y divide-gray-50">
                  {notes.map((note: any) => (
                    <div key={note.id} className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{note.title}</p>
                          {note.content && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{note.content}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {NOTE_TYPE_LABELS[note.type] ?? note.type}
                          </span>
                          <p className="text-xs text-gray-300 mt-1">{note.month}/{note.year}</p>
                        </div>
                      </div>
                      {note.url && (
                        <a href={note.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1.5 transition-colors">
                          <ExternalLink className="w-3 h-3" />Zobacz szczegóły
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>

          <div className="space-y-4">
            {/* Blog */}
            {tabVis.blog !== false && (
              <CollapsibleSection title="Blog" icon={BookOpen} badge={briefs.length || undefined} defaultOpen={false}>
                {briefs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Brak briefów</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {briefs.map((brief: any) => {
                      const cfg = STATUS_CONFIG[brief.status as keyof typeof STATUS_CONFIG];
                      const Icon = cfg?.icon ?? Clock;
                      return (
                        <div key={brief.id} className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900 mb-1.5">{brief.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.cls ?? ""}`}>
                              <Icon className="w-3 h-3" />{cfg?.label}
                            </span>
                            {brief.briefUrl && (
                              <a href={brief.briefUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-500 flex items-center gap-0.5 hover:text-indigo-700">
                                <ExternalLink className="w-3 h-3" /> Brief
                              </a>
                            )}
                            {brief.publishUrl && (
                              <a href={brief.publishUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-500 flex items-center gap-0.5 hover:text-green-700">
                                <ExternalLink className="w-3 h-3" /> Artykuł
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Linki */}
            {tabVis.links !== false && links.length > 0 && (
              <CollapsibleSection title="Pozyskane linki" icon={Link2} badge={links.length} defaultOpen={false}>
                <div className="divide-y divide-gray-50">
                  {links.map((link: any) => (
                    <div key={link.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700">{link.filename}</p>
                        <p className="text-xs text-gray-400">{link.month}/{link.year}</p>
                      </div>
                      {link.linksCount && (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {link.linksCount} linków
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Twoja strona */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Twoja strona</h3>
              <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                <Globe className="w-4 h-4 text-gray-300 flex-shrink-0" />
                {client.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Komentarze / wiadomości */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Wiadomości</h3>
              </div>
              <div className="p-4">
                {/* Send message */}
                <div className="flex gap-2 mb-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    placeholder="Napisz wiadomość do agencji..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    disabled={!commentText.trim() || sendingComment}
                    onClick={async () => {
                      if (!commentText.trim()) return;
                      setSendingComment(true);
                      try {
                        await portalApi.post("/client-portal/comments", { content: commentText.trim() });
                        setCommentText("");
                        mutateComments();
                      } catch {}
                      finally { setSendingComment(false); }
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors self-end">
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Message list */}
                {!comments || comments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Brak wiadomości</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((c: any) => (
                      <div key={c.id} className={`flex gap-2 ${c.authorType === "client" ? "flex-row-reverse" : ""}`}>
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-700">{c.authorName?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className={`max-w-[75%] ${c.authorType === "client" ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${c.authorType === "client" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                            {c.content}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 px-1">
                            {c.authorType === "agency" ? c.authorName : "Ty"} · {new Date(c.createdAt).toLocaleDateString("pl-PL")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
