"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  Plus, Search, ArrowRight, Globe, TrendingUp, ShoppingCart, Briefcase,
  Cpu, HeartPulse, Banknote, Building2, UtensilsCrossed, GraduationCap,
  Scale, Sparkles, Car, Plane, Dumbbell, Zap, Upload, X, FileUp,
} from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AddClientModal from "@/components/clients/AddClientModal";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const INDUSTRY_ICONS: Record<string, any> = {
  ecommerce: ShoppingCart, technology: Cpu, healthcare: HeartPulse,
  finance: Banknote, realestate: Building2, food: UtensilsCrossed,
  education: GraduationCap, legal: Scale, beauty: Sparkles,
  automotive: Car, travel: Plane, fitness: Dumbbell,
  energy: Zap, other: Briefcase,
};

export default function ClientsPage() {
  const { data: clients, mutate } = useSWR("/clients", fetcher);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/imports/clients/import", form, { headers: { "Content-Type": "multipart/form-data" } });
      const { created, skipped, errors } = res.data;
      toast.success(`Zaimportowano ${created} klientów${skipped > 0 ? `, pominięto ${skipped}` : ""}`);
      if (errors?.length) toast.error(`Błędy (${errors.length}): ${errors[0]}`);
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd importu");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const filtered = clients?.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Klienci</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients?.length ?? 0} klientów łącznie</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            title="Importuj klientów z CSV (wymagane kolumny: name, domain)"
            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            {importing ? <Upload className="w-4 h-4 animate-bounce" /> : <FileUp className="w-4 h-4" />}
            <span className="hidden sm:inline">{importing ? "Importuję..." : "Import CSV"}</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Dodaj klienta</span>
            <span className="sm:hidden">Dodaj</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie lub domenie..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!filtered ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold">{search ? "Brak wyników" : "Brak klientów"}</p>
            <p className="text-gray-400 text-sm mt-1">{search ? "Spróbuj innej frazy" : "Zacznij od dodania pierwszego klienta"}</p>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Dodaj klienta
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((client: any) => {
              const IndustryIcon = client.industry ? INDUSTRY_ICONS[client.industry] : null;
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {client.name[0]?.toUpperCase()}
                  </div>

                  {/* Name + domain */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                      {client.clientType && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-block ${client.clientType === "shop" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                          {client.clientType === "shop" ? "Sklep" : "Firma"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">{client.domain}</p>
                      {IndustryIcon && (
                        <IndustryIcon className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      )}
                      {client.engine && (
                        <span className="text-xs text-gray-300 hidden sm:inline">{client.engine}</span>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {client.senutoProjectId && (
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span className="hidden sm:inline">Senuto</span>
                      </span>
                    )}
                    {client.gscPropertyUrl && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        GSC
                      </span>
                    )}
                    {!client.senutoProjectId && !client.gscPropertyUrl && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                        Brak integracji
                      </span>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); mutate(); }}
        />
      )}
    </div>
  );
}
