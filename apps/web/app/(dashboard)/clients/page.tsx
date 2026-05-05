"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Search, ArrowRight, Globe, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import AddClientModal from "@/components/clients/AddClientModal";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ClientsPage() {
  const { data: clients, mutate } = useSWR("/clients", fetcher);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = clients?.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients?.length ?? 0} klientów łącznie</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Dodaj klienta
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj klientów..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!filtered ? (
          <div className="p-8 text-center text-gray-400">Ładowanie...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{search ? "Brak wyników" : "Brak klientów"}</p>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Dodaj pierwszego klienta
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((client: any) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {client.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-400 truncate">{client.domain}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {client.senutoProjectId && (
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Senuto
                    </span>
                  )}
                  {client.gscPropertyUrl && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                      GSC
                    </span>
                  )}
                  {!client.senutoProjectId && !client.gscPropertyUrl && (
                    <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-medium">
                      Brak integracji
                    </span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
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
