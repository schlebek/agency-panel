"use client";
import useSWR from "swr";
import Link from "next/link";
import {
  Users, TrendingUp, Search, ArrowRight, Plus, FileText,
  ShoppingCart, Cpu, HeartPulse, Banknote, Building2, UtensilsCrossed,
  GraduationCap, Scale, Sparkles, Car, Plane, Dumbbell, Zap, Briefcase,
  AlertTriangle, WifiOff, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const INDUSTRY_ICONS: Record<string, any> = {
  ecommerce: ShoppingCart, technology: Cpu, healthcare: HeartPulse,
  finance: Banknote, realestate: Building2, food: UtensilsCrossed,
  education: GraduationCap, legal: Scale, beauty: Sparkles,
  automotive: Car, travel: Plane, fitness: Dumbbell,
  energy: Zap, other: Briefcase,
};

function QuickLink({ href, icon: Icon, label, sub, color }: any) {
  return (
    <Link href={href} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:border-indigo-200 hover:shadow-sm transition-all group flex flex-col">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const { data: clients } = useSWR("/clients", fetcher);

  const activeClients = clients?.length ?? 0;
  const senutoCount = clients?.filter((c: any) => c.senutoProjectId)?.length ?? 0;
  const gscCount = clients?.filter((c: any) => c.gscPropertyUrl)?.length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Dzień dobry" : hour < 18 ? "Cześć" : "Dobry wieczór";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Welcome */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          {greeting}, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {tenant?.name} · {new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Aktywni klienci", value: activeClients, icon: Users, color: "bg-indigo-50 text-indigo-600", href: "/clients" },
          { label: "Senuto", value: senutoCount, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", href: "/clients" },
          { label: "GSC", value: gscCount, icon: Search, color: "bg-blue-50 text-blue-600", href: "/clients" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}
            className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
            <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-3`}>
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{clients ? stat.value : "—"}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Uwaga wymagana */}
      {(() => {
        if (!clients) return null;
        const downClients = clients.filter((c: any) => c.uptimeStatus === "down" && c.uptimeEnabled);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const noIntegration = clients.filter((c: any) => !c.senutoProjectId && !c.gscPropertyUrl && new Date(c.createdAt) < sevenDaysAgo);
        const items = [
          ...downClients.map((c: any) => ({ id: c.id, name: c.name, type: "down" as const, detail: "Strona niedostępna" })),
          ...noIntegration.slice(0, 3).map((c: any) => ({ id: c.id, name: c.name, type: "noIntegration" as const, detail: "Brak integracji SEO" })),
        ];
        if (items.length === 0) return (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Wszystko w porządku — brak alertów
          </div>
        );
        return (
          <div className="mb-6 bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-800">Uwaga wymagana ({items.length})</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <Link key={`${item.id}-${item.type}`} href={item.type === "down" ? `/clients/${item.id}/uptime` : `/clients/${item.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === "down" ? "bg-red-100" : "bg-amber-50"}`}>
                    {item.type === "down" ? <WifiOff className="w-3.5 h-3.5 text-red-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.detail}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Quick actions */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Szybki dostęp</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickLink href="/clients" icon={Users} label="Klienci" sub={`${activeClients} aktywnych`} color="bg-indigo-50 text-indigo-600" />
          <QuickLink href="/reports" icon={FileText} label="Raporty" sub="Generuj i wysyłaj" color="bg-purple-50 text-purple-600" />
          <QuickLink href="/settings" icon={Zap} label="Ustawienia" sub="Senuto, agencja" color="bg-amber-50 text-amber-600" />
          <Link href="/clients"
            className="bg-indigo-600 rounded-2xl p-4 sm:p-5 hover:bg-indigo-700 transition-all group flex flex-col text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold">Dodaj klienta</p>
            <p className="text-xs text-indigo-200 mt-0.5">Nowy projekt</p>
          </Link>
        </div>
      </div>

      {/* Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Client list (wider) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Klienci</h2>
            <Link href="/clients" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium transition-colors">
              Wszyscy <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div>
            {!clients ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : clients.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Brak klientów</p>
                <p className="text-gray-400 text-xs mt-1">Dodaj pierwszego klienta</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clients.slice(0, 8).map((client: any) => {
                  const IndustryIcon = client.industry ? INDUSTRY_ICONS[client.industry] : null;
                  return (
                    <Link key={client.id} href={`/clients/${client.id}`}
                      className="flex items-center gap-3 px-5 sm:px-6 py-3.5 hover:bg-gray-50 transition-colors group">
                      {client.logoUrl ? (
                        <img src={client.logoUrl} alt={client.name} className="w-9 h-9 rounded-xl object-contain border border-gray-100 bg-gray-50 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {client.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{client.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-gray-400 truncate">{client.domain}</p>
                          {IndustryIcon && <IndustryIcon className="w-3 h-3 text-gray-200 flex-shrink-0" />}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {client.senutoProjectId && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">S</span>
                        )}
                        {client.gscPropertyUrl && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">G</span>
                        )}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: info cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Plan info */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
            <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">Plan</p>
            <p className="text-xl font-bold capitalize">{tenant?.plan ?? "trial"}</p>
            {tenant?.trialEndsAt && (
              <p className="text-xs text-indigo-200 mt-1">
                Trial do: {new Date(tenant.trialEndsAt).toLocaleDateString("pl-PL")}
              </p>
            )}
          </div>

          {/* Integration status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Status integracji</h3>
            <div className="space-y-3">
              {[
                { label: "Senuto", count: senutoCount, total: activeClients, color: "bg-emerald-500" },
                { label: "Google Search Console", count: gscCount, total: activeClients, color: "bg-blue-500" },
              ].map(({ label, count, total, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-medium text-gray-700">{count}/{total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: total ? `${Math.round((count / total) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Szybki dostęp</h3>
            <div className="space-y-1">
              {[
                { href: "/reports", icon: FileText, label: "Generuj raporty" },
                { href: "/team", icon: Users, label: "Zarządzaj zespołem" },
                { href: "/settings", icon: Zap, label: "Ustawienia agencji" },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
