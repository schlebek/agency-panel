"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Search, FileText, Link2, FileEdit, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const tabs = [
  { label: "SEO (Senuto)", href: "seo", icon: TrendingUp },
  { label: "Google Search Console", href: "gsc", icon: Search },
  { label: "Linki", href: "links", icon: Link2 },
  { label: "Prace", href: "notes", icon: FileEdit },
  { label: "Raporty", href: "reports", icon: FileText },
];

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client } = useSWR(`/clients/${id}`, fetcher);

  if (!client) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Klienci
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
            {client.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-indigo-600 transition-colors">
              {client.domain}
            </a>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-5 gap-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/clients/${id}/${tab.href}`}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mb-3 transition-colors">
              <tab.icon className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">{tab.label}</p>
          </Link>
        ))}
      </div>

      {/* Client details */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Szczegóły klienta</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Email kontaktowy</p>
            <p className="text-sm text-gray-900">{client.contactEmail ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">ID projektu Senuto</p>
            <p className="text-sm text-gray-900">{client.senutoProjectId ?? "Nie skonfigurowano"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Właściwość GSC</p>
            <p className="text-sm text-gray-900">{client.gscPropertyUrl ?? "Nie połączono"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Dodano</p>
            <p className="text-sm text-gray-900">{new Date(client.createdAt).toLocaleDateString("pl-PL")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
