"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, Search, FileText, Link2, FileEdit, ArrowLeft, Pencil, X,
  CheckSquare, BookOpen, ShoppingCart, Briefcase, Cpu, HeartPulse,
  Banknote, Building2, UtensilsCrossed, GraduationCap, Scale, Sparkles,
  Car, Plane, Dumbbell, Zap, UserPlus, Trash2, Eye, EyeOff, RefreshCw,
  ExternalLink, Users, KeyRound, ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const PORTAL_TABS = [
  { key: "seo", label: "SEO (Senuto)", icon: TrendingUp },
  { key: "gsc", label: "Google Search Console", icon: Search },
  { key: "links", label: "Linki", icon: Link2 },
  { key: "notes", label: "Prace", icon: FileEdit },
  { key: "optimization", label: "Optymalizacja", icon: CheckSquare },
  { key: "blog", label: "Blog", icon: BookOpen },
  { key: "reports", label: "Raporty", icon: FileText },
];

const INDUSTRIES = [
  { value: "ecommerce", label: "E-commerce", icon: ShoppingCart },
  { value: "technology", label: "Technologia", icon: Cpu },
  { value: "healthcare", label: "Zdrowie", icon: HeartPulse },
  { value: "finance", label: "Finanse", icon: Banknote },
  { value: "realestate", label: "Nieruchomości", icon: Building2 },
  { value: "food", label: "Gastronomia", icon: UtensilsCrossed },
  { value: "education", label: "Edukacja", icon: GraduationCap },
  { value: "legal", label: "Prawo", icon: Scale },
  { value: "beauty", label: "Uroda / Spa", icon: Sparkles },
  { value: "automotive", label: "Motoryzacja", icon: Car },
  { value: "travel", label: "Turystyka", icon: Plane },
  { value: "fitness", label: "Fitness", icon: Dumbbell },
  { value: "energy", label: "Energetyka", icon: Zap },
  { value: "other", label: "Inne", icon: Briefcase },
];

const ENGINES = [
  "WordPress", "PrestaShop", "Shopify", "WooCommerce", "Magento",
  "Joomla", "Drupal", "Wix", "Squarespace", "PHP (własny)", "Inne",
];

function getIndustryInfo(value: string | null | undefined) {
  return INDUSTRIES.find((i) => i.value === value) ?? null;
}

// ─── Edit client modal ────────────────────────────────────────────────────────

const EDIT_FORM_ID = "edit-client-form";

function EditClientModal({ client, onClose, onSuccess }: { client: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState({
    name: client.name ?? "",
    domain: client.domain ?? "",
    contactEmail: client.contactEmail ?? "",
    clientType: client.clientType ?? "company",
    industry: client.industry ?? "",
    engine: client.engine ?? "",
    senutoProjectId: client.senutoProjectId ?? "",
    gscPropertyUrl: client.gscPropertyUrl ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function detectEngine() {
    setDetecting(true);
    try {
      const res = await api.post(`/clients/${client.id}/detect-engine`);
      if (res.data.engine) {
        setForm((f) => ({ ...f, engine: res.data.engine }));
        toast.success(`Wykryto: ${res.data.engine}`);
      } else {
        toast.info("Nie udało się wykryć silnika automatycznie");
      }
    } catch { toast.error("Błąd detekcji"); }
    finally { setDetecting(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
      );
      await api.patch(`/clients/${client.id}`, payload);
      toast.success("Klient zaktualizowany");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd zapisu");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Edytuj klienta</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form id={EDIT_FORM_ID} onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nazwa klienta *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Np. Sklep ABC" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Domena *</label>
              <input name="domain" value={form.domain} onChange={handleChange} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="example.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Email kontaktowy</label>
              <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="klient@example.com" />
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Klasyfikacja</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "company", label: "Strona firmowa" }, { value: "shop", label: "Sklep" }].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm((f) => ({ ...f, clientType: opt.value as any }))}
                    className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-colors ${form.clientType === opt.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Branża</label>
                <select name="industry" value={form.industry} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— wybierz —</option>
                  {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value}>{ind.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Silnik CMS</label>
                <div className="flex gap-2">
                  <select name="engine" value={form.engine} onChange={handleChange}
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— wybierz —</option>
                    {ENGINES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <button type="button" onClick={detectEngine} disabled={detecting}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap">
                    <RefreshCw className={`w-3.5 h-3.5 ${detecting ? "animate-spin" : ""}`} />
                    {detecting ? "Wykrywam..." : "Auto-wykryj"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Integracje</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Domena Senuto <span className="text-gray-300 normal-case font-normal">(opcjonalnie — domyślnie domena klienta)</span></label>
                <input name="senutoProjectId" value={form.senutoProjectId} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="np. example.com (zostaw puste by użyć domeny klienta)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">URL właściwości GSC</label>
                <input name="gscPropertyUrl" value={form.gscPropertyUrl} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/" />
              </div>
            </div>
          </div>
        </form>
        <div className="flex gap-3 p-6 pt-0 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Anuluj
          </button>
          <button
            type="submit"
            form={EDIT_FORM_ID}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add client account modal ─────────────────────────────────────────────────

function AddAccountModal({ clientId, onClose, onSuccess }: { clientId: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/clients/${clientId}/accounts`, form);
      toast.success("Konto klienta utworzone");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd tworzenia konta");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Dodaj konto klienta</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">Klient zaloguje się przez <span className="font-medium text-gray-700">/portal/login</span></p>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Imię i nazwisko</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jan Kowalski" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Adres e-mail</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="klient@firma.pl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Hasło</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min. 8 znaków" />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? "Tworzenie..." : "Utwórz konto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab visibility panel ─────────────────────────────────────────────────────

function TabVisibilityPanel({ clientId, visibility, onUpdate }: {
  clientId: string;
  visibility: Record<string, boolean>;
  onUpdate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    PORTAL_TABS.forEach((t) => { defaults[t.key] = visibility[t.key] !== false; });
    return defaults;
  });

  async function toggle(key: string) {
    const updated = { ...local, [key]: !local[key] };
    setLocal(updated);
    setSaving(true);
    try {
      await api.patch(`/clients/${clientId}/tab-visibility`, { visibility: updated });
      onUpdate();
    } catch { toast.error("Błąd zapisu"); setLocal(local); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Widoczne zakładki w panelu klienta</p>
        {saving && <span className="text-xs text-gray-400">Zapisywanie...</span>}
      </div>
      <div className="space-y-1">
        {PORTAL_TABS.map((tab) => {
          const visible = local[tab.key] !== false;
          return (
            <button key={tab.key} onClick={() => toggle(tab.key)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
              <tab.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${visible ? "text-indigo-500" : "text-gray-300"}`} />
              <span className={`flex-1 text-sm text-left transition-colors ${visible ? "text-gray-700" : "text-gray-400"}`}>
                {tab.label}
              </span>
              {visible
                ? <ToggleRight className="w-5 h-5 text-indigo-500" />
                : <ToggleLeft className="w-5 h-5 text-gray-300" />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Client accounts panel ───────────────────────────────────────────────────

function ClientAccountsPanel({ clientId }: { clientId: string }) {
  const { data: accounts, mutate } = useSWR(`/clients/${clientId}/accounts`, fetcher);
  const [showAdd, setShowAdd] = useState(false);

  async function deleteAccount(accountId: string, name: string) {
    if (!confirm(`Usunąć konto "${name}"?`)) return;
    try {
      await api.delete(`/clients/${clientId}/accounts/${accountId}`);
      toast.success("Konto usunięte");
      mutate();
    } catch { toast.error("Błąd usuwania"); }
  }

  async function toggleActive(accountId: string, isActive: boolean) {
    try {
      await api.patch(`/clients/${clientId}/accounts/${accountId}`, { isActive: !isActive });
      toast.success(isActive ? "Konto dezaktywowane" : "Konto aktywowane");
      mutate();
    } catch { toast.error("Błąd"); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Konta dostępowe klientów</p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors">
          <UserPlus className="w-3.5 h-3.5" />
          Dodaj
        </button>
      </div>

      {!accounts ? (
        <div className="h-12 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl">
          Brak kont — klient nie może się zalogować
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-indigo-700">{acc.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{acc.name}</p>
                <p className="text-xs text-gray-400 truncate">{acc.email}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${acc.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {acc.isActive ? "Aktywne" : "Nieaktywne"}
                </span>
                <button onClick={() => toggleActive(acc.id, acc.isActive)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors" title="Zmień status">
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteAccount(acc.id, acc.name)}
                  className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-white transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <ExternalLink className="w-3 h-3" />
        <span>Link do portalu: <span className="font-medium text-gray-600">/portal/login</span></span>
      </div>

      {showAdd && (
        <AddAccountModal
          clientId={clientId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); mutate(); }}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, mutate } = useSWR(`/clients/${id}`, fetcher);
  const [showEdit, setShowEdit] = useState(false);

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const industryInfo = getIndustryInfo(client.industry);
  const IndustryIcon = industryInfo?.icon;

  return (
    <div className="p-4 sm:p-8">
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Klienci
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{client.name}</h1>
                {client.clientType && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${client.clientType === "shop" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                    {client.clientType === "shop" ? "Sklep" : "Strona firmowa"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
                  {client.domain}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {IndustryIcon && industryInfo && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <IndustryIcon className="w-3.5 h-3.5" />
                    {industryInfo.label}
                  </span>
                )}
                {client.engine && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{client.engine}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors self-start sm:self-auto">
            <Pencil className="w-4 h-4" />
            Edytuj
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6">
        {/* Left: tabs */}
        <div className="xl:col-span-2 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {PORTAL_TABS.map((tab) => (
              <Link key={tab.key} href={`/clients/${id}/${tab.key}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:border-indigo-200 hover:shadow-sm transition-all group">
                <div className="w-9 h-9 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mb-3 transition-colors">
                  <tab.icon className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors leading-tight">{tab.label}</p>
              </Link>
            ))}
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-4 text-sm">Szczegóły</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Email kontaktowy</p>
                <p className="text-sm text-gray-900">{client.contactEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Typ / branża</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {client.clientType && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${client.clientType === "shop" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                      {client.clientType === "shop" ? "Sklep" : "Strona firmowa"}
                    </span>
                  )}
                  {industryInfo && IndustryIcon && (
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <IndustryIcon className="w-4 h-4 text-gray-400" />
                      {industryInfo.label}
                    </span>
                  )}
                  {!client.clientType && !client.industry && <span className="text-sm text-gray-400">—</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Silnik CMS</p>
                <p className="text-sm text-gray-900">{client.engine ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Senuto</p>
                <p className="text-sm">
                  {client.senutoProjectId && client.senutoProjectId.includes(".")
                    ? <span className="text-green-600">Śledzi: {client.senutoProjectId}</span>
                    : <span className="text-gray-500">Śledzi: {client.domain}</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">GSC</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-900">{client.gscPropertyUrl ?? "—"}</p>
                  {client.hasGscCredentials && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Połączone</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Dodano</p>
                <p className="text-sm text-gray-900">{new Date(client.createdAt).toLocaleDateString("pl-PL")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: portal access */}
        <div className="space-y-4">
          {/* Tab visibility */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Portal klienta</h2>
            </div>
            <TabVisibilityPanel
              clientId={id}
              visibility={client.tabVisibility ?? {}}
              onUpdate={() => mutate()}
            />
          </div>

          {/* Client accounts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Dostęp do portalu</h2>
            </div>
            <ClientAccountsPanel clientId={id} />
          </div>
        </div>
      </div>

      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); mutate(); }}
        />
      )}
    </div>
  );
}
