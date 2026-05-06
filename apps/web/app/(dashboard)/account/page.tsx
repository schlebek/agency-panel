"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, Mail, Lock, Save, Eye, EyeOff } from "lucide-react";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 items-start py-4 border-b border-gray-50 last:border-0">
      <label className="text-sm font-medium text-gray-700 sm:pt-2.5">{label}</label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
    />
  );
}

export default function AccountPage() {
  const { user, fetchMe } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const payload: any = {};
      if (profileForm.name !== user?.name) payload.name = profileForm.name;
      if (profileForm.email !== user?.email) payload.email = profileForm.email;
      if (!Object.keys(payload).length) { toast.info("Brak zmian do zapisania"); return; }
      await api.patch("/auth/me", payload);
      await fetchMe();
      toast.success("Profil zaktualizowany");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd zapisu");
    } finally {
      setProfileLoading(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error("Hasła nie są identyczne");
      return;
    }
    setPassLoading(true);
    try {
      await api.patch("/auth/me", {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Hasło zmienione");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd zmiany hasła");
    } finally {
      setPassLoading(false);
    }
  }

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ustawienia konta</h1>
        <p className="text-sm text-gray-400 mt-1">Zarządzaj profilem i bezpieczeństwem konta</p>
      </div>

      <div className="space-y-5">
        {/* Avatar */}
        <Section title="Zdjęcie profilowe" description="Inicjały są generowane automatycznie z Twojego imienia">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className="inline-block mt-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full capitalize">{user?.role}</span>
            </div>
          </div>
        </Section>

        {/* Profile */}
        <Section title="Dane profilu" description="Zaktualizuj swoje imię i adres e-mail">
          <form onSubmit={saveProfile}>
            <FieldRow label="Imię i nazwisko">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="Jan Kowalski"
                />
              </div>
            </FieldRow>
            <FieldRow label="Adres e-mail">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="jan@agencja.pl"
                />
              </div>
            </FieldRow>
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {profileLoading ? "Zapisywanie..." : "Zapisz zmiany"}
              </button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Zmiana hasła" description="Minimalna długość hasła to 8 znaków">
          <form onSubmit={savePassword}>
            <FieldRow label="Aktualne hasło">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type={showPass.current ? "text" : "password"}
                  value={passForm.currentPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="Aktualne hasło"
                />
                <button type="button" onClick={() => setShowPass((s) => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  {showPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FieldRow>
            <FieldRow label="Nowe hasło">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type={showPass.new ? "text" : "password"}
                  value={passForm.newPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="Min. 8 znaków"
                />
                <button type="button" onClick={() => setShowPass((s) => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passForm.newPassword.length > 0 && passForm.newPassword.length < 8 && (
                <p className="text-xs text-red-500 mt-1.5">Hasło musi mieć co najmniej 8 znaków</p>
              )}
            </FieldRow>
            <FieldRow label="Potwierdź hasło">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type={showPass.confirm ? "text" : "password"}
                  value={passForm.confirmPassword}
                  onChange={(e) => setPassForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="Powtórz nowe hasło"
                />
                <button type="button" onClick={() => setShowPass((s) => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1.5">Hasła nie są identyczne</p>
              )}
            </FieldRow>
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={passLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {passLoading ? "Zapisywanie..." : "Zmień hasło"}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </div>
  );
}
