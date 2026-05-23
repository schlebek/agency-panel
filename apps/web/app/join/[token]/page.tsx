"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, UserCheck } from "lucide-react";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<{ email: string; agencyName: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/auth/invite/${token}`)
      .then((r) => setInvite(r.data))
      .catch((err) => setError(err.response?.data?.error ?? "Nieważne zaproszenie"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Hasła nie są identyczne"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/accept-invite", { token, name: form.name, password: form.password });
      localStorage.setItem("token", res.data.token);
      toast.success("Konto utworzone — witaj w zespole!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd tworzenia konta");
    } finally { setLoading(false); }
  }

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-xl">✕</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Nieprawidłowe zaproszenie</h1>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Dołącz do {invite.agencyName}</h1>
          <p className="text-sm text-gray-500">
            Zaproszono Cię jako <strong>{invite.role === "admin" ? "Admin" : "Członek"}</strong> na adres <strong>{invite.email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Twoje imię i nazwisko</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jan Kowalski" minLength={2} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Hasło</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} required value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min. 8 znaków" minLength={8} />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Powtórz hasło</label>
            <input type={showPass ? "text" : "password"} required value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Powtórz hasło" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2">
            {loading ? "Tworzenie konta..." : "Utwórz konto i dołącz"}
          </button>
        </form>
      </div>
    </div>
  );
}
