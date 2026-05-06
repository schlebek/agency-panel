"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Key, Building2, CreditCard } from "lucide-react";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  trialEndsAt: string | null;
  hasSenutoKey: boolean;
  senutoApiKey: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [senutoLogin, setSenutoLogin] = useState("");
  const [senutoPassword, setSenutoPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then(({ data }) => {
      setSettings(data);
      setAgencyName(data.name);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (agencyName !== settings?.name) body.name = agencyName;
      if (senutoLogin && senutoPassword) {
        body.senutoLogin = senutoLogin;
        body.senutoPassword = senutoPassword;
      }
      if (Object.keys(body).length === 0) {
        toast.info("Brak zmian do zapisania");
        return;
      }
      await api.put("/settings", body);
      toast.success("Ustawienia zapisane");
      setSenutoLogin("");
      setSenutoPassword("");
      const { data } = await api.get("/settings");
      setSettings(data);
    } catch {
      toast.error("Błąd zapisu ustawień");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ustawienia</h1>
        <p className="text-gray-500 mt-1">Zarządzaj konfiguracją agencji</p>
      </div>

      <div className="space-y-6">
        {/* Plan info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Plan</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium capitalize">
              {settings.plan}
            </span>
            {settings.trialEndsAt && (
              <span className="text-sm text-gray-500">
                Trial do: {new Date(settings.trialEndsAt).toLocaleDateString("pl-PL")}
              </span>
            )}
          </div>
        </div>

        {/* Agency settings form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Konfiguracja</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Building2 className="w-4 h-4 inline mr-1.5 text-gray-400" />
              Nazwa agencji
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              <Key className="w-4 h-4 inline mr-1.5 text-gray-400" />
              Połączenie z Senuto
            </label>
            {settings.hasSenutoKey && (
              <p className="text-xs text-green-600">✓ Token aktywny — Senuto połączone</p>
            )}
            <input
              type="email"
              value={senutoLogin}
              onChange={(e) => setSenutoLogin(e.target.value)}
              placeholder="Login Senuto (email)"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="password"
              value={senutoPassword}
              onChange={(e) => setSenutoPassword(e.target.value)}
              placeholder={settings.hasSenutoKey ? "Hasło Senuto (zostaw puste aby nie zmieniać)" : "Hasło Senuto"}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <p className="text-xs text-gray-400">
              Użyj loginu i hasła z konta Senuto. Token zostanie wygenerowany automatycznie.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Zapisywanie..." : "Zapisz ustawienia"}
          </button>
        </form>
      </div>
    </div>
  );
}
