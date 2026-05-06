"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { usePortalStore, portalApi } from "@/lib/portal-store";
import {
  TrendingUp, Globe, LogOut, CheckSquare, Square, BookOpen, Link2,
  FileEdit, CheckCircle2, Clock, Send, ExternalLink, ChevronDown, ChevronUp,
  BarChart3, Zap, FileText,
} from "lucide-react";

const portalFetcher = (url: string) => portalApi.get(url).then((r) => r.data);

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
  optimization: "Optymalizacja",
  text: "Tekst",
  brief: "Brief",
  link_building: "Link building",
  technical: "Techniczne",
  other: "Inne",
};

function StatCard({ label, value, sub, icon: Icon, color = "indigo" }: any) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  } as any;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 leading-tight">{label}</p>
        {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4.5 h-4.5 text-indigo-500" />
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
      </button>
      {open && <div className="border-t border-gray-50">{children}</div>}
    </div>
  );
}

export default function PortalDashboard() {
  const router = useRouter();
  const { account, client, logout } = usePortalStore();
  const { data, isLoading } = useSWR("/client-portal/data", portalFetcher);

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

  const notes = data?.notes ?? [];
  const briefs = data?.briefs ?? [];
  const links = data?.links ?? [];

  const doneCount = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const publishedBriefs = briefs.filter((b: any) => b.status === "published").length;

  function handleLogout() {
    logout();
    router.push("/portal/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{client.name}</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* Welcome + stats */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Cześć, {account.name.split(" ")[0]}!
          </h1>
          <p className="text-sm text-gray-400">Przegląd prac i wyników dla {client.name}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard icon={CheckSquare} label="Optymalizacja SEO" value={`${doneCount}/${totalCount}`} sub="ukończonych zadań" color="indigo" />
          <StatCard icon={BookOpen} label="Artykuły opublikowane" value={publishedBriefs} color="green" />
          <StatCard icon={Link2} label="Pliki z linkami" value={links.length} color="blue" />
          <StatCard icon={FileEdit} label="Wykonane prace" value={notes.length} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left column - main content */}
          <div className="lg:col-span-2 space-y-4">

            {/* Optymalizacja SEO */}
            {tabVis.optimization !== false && (
              <CollapsibleSection title="Optymalizacja SEO" icon={CheckSquare}>
                {/* Progress */}
                <div className="px-6 py-4 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Postęp wdrożenia</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {Math.round((doneCount / totalCount) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                    />
                  </div>
                  {doneCount === totalCount && (
                    <div className="flex items-center gap-1.5 mt-2 text-green-600 text-xs font-medium">
                      <Zap className="w-3.5 h-3.5" />
                      Wszystkie prace ukończone!
                    </div>
                  )}
                </div>
                {/* Checklist */}
                <div className="divide-y divide-gray-50">
                  {CHECKLIST_ITEMS.map((item) => {
                    const done = !!checklist[item.key];
                    return (
                      <div key={item.key} className="flex items-center gap-3 px-6 py-3">
                        {done
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-gray-200 flex-shrink-0" />
                        }
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
              <CollapsibleSection title="Wykonane prace" icon={FileEdit}>
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
                          <p className="text-xs text-gray-300 mt-1">
                            {note.month}/{note.year}
                          </p>
                        </div>
                      </div>
                      {note.url && (
                        <a href={note.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1.5 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          Zobacz szczegóły
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* Right column - sidebar */}
          <div className="space-y-4">
            {/* Blog */}
            {tabVis.blog !== false && (
              <CollapsibleSection title="Blog" icon={BookOpen} defaultOpen={true}>
                {briefs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Brak briefów</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {briefs.map((brief: any) => {
                      const cfg = STATUS_CONFIG[brief.status as keyof typeof STATUS_CONFIG];
                      const Icon = cfg.icon;
                      return (
                        <div key={brief.id} className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900 mb-1.5">{brief.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                            {brief.briefUrl && (
                              <a href={brief.briefUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-indigo-500 flex items-center gap-0.5 hover:text-indigo-700 transition-colors">
                                <ExternalLink className="w-3 h-3" /> Brief
                              </a>
                            )}
                            {brief.publishUrl && (
                              <a href={brief.publishUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-500 flex items-center gap-0.5 hover:text-green-700 transition-colors">
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
              <CollapsibleSection title="Pozyskane linki" icon={Link2} defaultOpen={false}>
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

            {/* Info o stronie */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Twoja strona</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors truncate">
                    {client.domain}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
