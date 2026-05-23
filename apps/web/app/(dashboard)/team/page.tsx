"use client";
import useSWR from "swr";
import { useState } from "react";
import { Users, UserPlus, Trash2, Shield, Mail, X, Crown, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const ROLE_LABELS: Record<string, string> = { owner: "Właściciel", admin: "Admin", member: "Członek" };
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-50 text-amber-700",
  admin: "bg-indigo-50 text-indigo-700",
  member: "bg-gray-100 text-gray-600",
};

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (url: string) => void }) {
  const [form, setForm] = useState({ email: "", role: "member" as "admin" | "member" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/team/invite", form);
      onSuccess(res.data.inviteUrl);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd wysyłania zaproszenia");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Zaproś członka zespołu</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Adres e-mail</label>
            <input type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="kolega@agencja.pl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Rola</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="member">Członek — dostęp tylko do odczytu</option>
              <option value="admin">Admin — pełen dostęp, brak zarządzania zespołem</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Wysyłanie..." : "Wyślij zaproszenie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteLinkModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Zaproszenie wysłane</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">Email z zaproszeniem został wysłany. Możesz też udostępnić link bezpośrednio:</p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 bg-gray-50" />
          <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Skopiowano"); }}
            className="px-3 py-2 bg-indigo-600 text-white text-xs rounded-xl hover:bg-indigo-700">
            Kopiuj
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
          Zamknij
        </button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { data, mutate } = useSWR("/team", fetcher);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function cancelInvite(id: string) {
    try {
      await api.delete(`/team/invite/${id}`);
      toast.success("Zaproszenie anulowane");
      mutate();
    } catch { toast.error("Błąd"); }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/team/${userId}`, { isActive: !isActive });
      toast.success(isActive ? "Konto dezaktywowane" : "Konto aktywowane");
      mutate();
    } catch (err: any) { toast.error(err.response?.data?.error ?? "Błąd"); }
  }

  async function changeRole(userId: string, role: string) {
    try {
      await api.patch(`/team/${userId}`, { role });
      toast.success("Rola zmieniona");
      mutate();
    } catch (err: any) { toast.error(err.response?.data?.error ?? "Błąd"); }
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(`Dezaktywować konto "${name}"?`)) return;
    try {
      await api.delete(`/team/${userId}`);
      toast.success("Konto dezaktywowane");
      mutate();
    } catch (err: any) { toast.error(err.response?.data?.error ?? "Błąd"); }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Zespół</h1>
            <p className="text-sm text-gray-400">Zarządzaj dostępem do panelu agencji</p>
          </div>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          Zaproś
        </button>
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Członkowie zespołu</h2>
        </div>
        {!data ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.members.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">Brak członków</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-indigo-700">{m.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    {m.role === "owner" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {m.email}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                  {!m.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Nieaktywne</span>
                  )}
                  {m.role !== "owner" && (
                    <div className="flex items-center gap-1">
                      <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="admin">Admin</option>
                        <option value="member">Członek</option>
                      </select>
                      <button onClick={() => toggleActive(m.id, m.isActive)}
                        title={m.isActive ? "Dezaktywuj" : "Aktywuj"}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition-colors">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeMember(m.id, m.name)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {data?.pendingInvites?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Oczekujące zaproszenia</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.pendingInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    Wygasa: {new Date(inv.expiresAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[inv.role]}`}>
                    {ROLE_LABELS[inv.role]}
                  </span>
                  <button onClick={() => cancelInvite(inv.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={(url) => { setShowInvite(false); setInviteUrl(url); mutate(); }}
        />
      )}
      {inviteUrl && <InviteLinkModal url={inviteUrl} onClose={() => setInviteUrl(null)} />}
    </div>
  );
}
