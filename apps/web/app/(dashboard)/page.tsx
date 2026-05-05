"use client";
import useSWR from "swr";
import Link from "next/link";
import { Users, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  const { data: clients } = useSWR("/clients", fetcher);

  const stats = [
    {
      label: "Aktywni klienci",
      value: clients?.length ?? "—",
      icon: Users,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Integracje Senuto",
      value: clients?.filter((c: any) => c.senutoProjectId)?.length ?? "—",
      icon: TrendingUp,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Połączenia GSC",
      value: clients?.filter((c: any) => c.gscPropertyUrl)?.length ?? "—",
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Witaj, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Oto podsumowanie Twojej agencji</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className={`inline-flex p-2.5 rounded-xl ${stat.color} mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Clients list */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Ostatni klienci</h2>
          <Link href="/clients" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Wszyscy klienci <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {!clients ? (
            <div className="p-6 text-center text-gray-400">Ładowanie...</div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Brak klientów</p>
              <p className="text-gray-400 text-sm mt-1">Dodaj pierwszego klienta, żeby zacząć</p>
              <Link
                href="/clients/new"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Dodaj klienta
              </Link>
            </div>
          ) : (
            clients.slice(0, 8).map((client: any) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                  {client.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.domain}</p>
                </div>
                <div className="flex gap-2">
                  {client.senutoProjectId && (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Senuto</span>
                  )}
                  {client.gscPropertyUrl && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">GSC</span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
