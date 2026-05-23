"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, User } from "lucide-react";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Dodano klienta",
  "client.updated": "Zaktualizowano klienta",
  "client.deleted": "Usunięto klienta",
  "report.created": "Wygenerowano raport",
  "report.sent": "Wysłano raport",
  "goals.updated": "Zaktualizowano cele",
  "note.created": "Dodano notatkę",
  "note.deleted": "Usunięto notatkę",
};

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: logs } = useSWR(`/clients/${id}/audit?limit=100`, fetcher);

  return (
    <div className="p-4 sm:p-8">
      <Link href={`/clients/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Klient
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Dziennik zmian</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {!logs ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            Brak wpisów w dzienniku
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div key={log.id} className="flex gap-4 relative">
                  <div className="w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center flex-shrink-0 z-10">
                    <User className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      {log.entityType && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{log.entityType}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("pl-PL")}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-1.5 text-xs bg-gray-50 rounded-lg p-2 text-gray-500 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
