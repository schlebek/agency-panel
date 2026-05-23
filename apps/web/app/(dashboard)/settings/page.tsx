"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Settings, Key, Building2, CreditCard, BrainCircuit,
  Globe, Phone, MapPin, Mail, Hash, ImageIcon, Trash2,
  Upload, Palette, MessageSquare, Link, Landmark,
  Bell, Webhook, Plus, X, CheckCircle2, XCircle, Copy,
} from "lucide-react";

interface TenantSettings {
  id: string; name: string; slug: string; plan: string;
  isActive: boolean; trialEndsAt: string | null;
  hasSenutoKey: boolean; senutoApiKey: string | null;
  hasGeminiKey: boolean; geminiApiKey: string | null;
  // Identyfikacja wizualna
  logoUrl: string | null; hasLogo: boolean;
  faviconUrl: string | null; hasFavicon: boolean;
  brandColor: string; tagline: string;
  // Dane agencji
  website: string; phone: string; address: string;
  contactEmail: string; nip: string; regon: string; krs: string; bankAccount: string;
  // Social media
  socialLinkedin: string; socialFacebook: string; socialInstagram: string;
  // Komunikacja
  emailFooter: string;
  // Auto-raporty
  autoReportEnabled: boolean; autoReportDay: number; autoReportEmail: string;
  // Alerty
  alertsEnabled: boolean; alertThreshold: number; alertEmail: string;
}

const WEBHOOK_EVENTS_LIST = [
  "client.created", "client.updated", "report.sent",
  "visibility.drop", "uptime.down", "uptime.recovered",
];

const fetcher = (url: string) => api.get(url).then((r) => r.data);

// Prosty wrapper sekcji
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {Icon && <Icon className="w-4 h-4 inline mr-1.5 text-gray-400" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";
const btnPrimary = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm";

// Uploader pliku (logo / favicon)
function ImageUploader({
  label, hint, accept, maxKB, fieldName, currentUrl, hasFile,
  onUpload, onDelete, uploading, deleting,
}: {
  label: string; hint: string; accept: string; maxKB: number; fieldName: string;
  currentUrl: string | null; hasFile: boolean;
  onUpload: (file: File) => void; onDelete: () => void;
  uploading: boolean; deleting: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const previewSize = fieldName === "favicon" ? "w-16 h-16" : "w-24 h-24";

  return (
    <div className="flex items-start gap-5">
      <div className={`${previewSize} rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 relative flex-shrink-0`}>
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-full h-full object-contain p-1.5" />
        ) : (
          <ImageIcon className="w-7 h-7 text-gray-300" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-sm text-gray-500">{hint}</p>
        <input
          ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > maxKB * 1024) { toast.error(`Plik nie może być większy niż ${maxKB} KB`); return; }
            onUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <button
            type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {hasFile ? "Zmień" : "Wgraj"}
          </button>
          {hasFile && (
            <button
              type="button" onClick={onDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Usuwanie..." : "Usuń"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { fetchMe } = useAuthStore();
  const [s, setS] = useState<TenantSettings | null>(null);

  // Identyfikacja wizualna
  const [brandColor, setBrandColor] = useState("#4F46E5");
  const [tagline, setTagline] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [deletingFavicon, setDeletingFavicon] = useState(false);
  const [savingVisual, setSavingVisual] = useState(false);

  // Dane agencji
  const [agencyName, setAgencyName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [nip, setNip] = useState("");
  const [regon, setRegon] = useState("");
  const [krs, setKrs] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [savingAgency, setSavingAgency] = useState(false);

  // Social media
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // Komunikacja
  const [emailFooter, setEmailFooter] = useState("");
  const [savingComm, setSavingComm] = useState(false);

  // Integracje
  const [senutoLogin, setSenutoLogin] = useState("");
  const [senutoPassword, setSenutoPassword] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  // Auto-raporty
  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [autoReportDay, setAutoReportDay] = useState(1);
  const [autoReportEmail, setAutoReportEmail] = useState("");
  const [savingAutoReport, setSavingAutoReport] = useState(false);

  // Alerty
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [alertEmail, setAlertEmail] = useState("");
  const [savingAlerts, setSavingAlerts] = useState(false);

  // Webhooks
  const { data: webhooks, mutate: mutateWebhooks } = useSWR("/webhooks", fetcher);
  const [newWebhook, setNewWebhook] = useState({ url: "", events: [] as string[] });
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get("/settings");
    setS(data);
    setBrandColor(data.brandColor);
    setTagline(data.tagline);
    setAgencyName(data.name);
    setWebsite(data.website);
    setPhone(data.phone);
    setAddress(data.address);
    setContactEmail(data.contactEmail);
    setNip(data.nip);
    setRegon(data.regon);
    setKrs(data.krs);
    setBankAccount(data.bankAccount);
    setSocialLinkedin(data.socialLinkedin);
    setSocialFacebook(data.socialFacebook);
    setSocialInstagram(data.socialInstagram);
    setEmailFooter(data.emailFooter);
    setAutoReportEnabled(data.autoReportEnabled ?? false);
    setAutoReportDay(data.autoReportDay ?? 1);
    setAutoReportEmail(data.autoReportEmail ?? "");
    setAlertsEnabled(data.alertsEnabled ?? false);
    setAlertThreshold(data.alertThreshold ?? 10);
    setAlertEmail(data.alertEmail ?? "");
  }

  useEffect(() => { load(); }, []);

  async function save(body: Record<string, string>, setSaving: (v: boolean) => void) {
    setSaving(true);
    try {
      await api.put("/settings", body);
      toast.success("Zapisano");
      await fetchMe();
      await load();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(field: "logo" | "favicon", file: File, setUploading: (v: boolean) => void) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append(field, file);
      const { data } = await api.post(`/settings/${field}`, form);
      setS((prev) => prev ? {
        ...prev,
        [`${field}Url`]: data[`${field}Url`],
        [`has${field.charAt(0).toUpperCase() + field.slice(1)}`]: true,
      } : prev);
      await fetchMe();
      toast.success(`${field === "logo" ? "Logo" : "Favicon"} zaktualizowane`);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd uploadu");
    } finally {
      setUploading(false);
    }
  }

  async function deleteImage(field: "logo" | "favicon", setDeleting: (v: boolean) => void) {
    setDeleting(true);
    try {
      await api.delete(`/settings/${field}`);
      setS((prev) => prev ? {
        ...prev,
        [`${field}Url`]: null,
        [`has${field.charAt(0).toUpperCase() + field.slice(1)}`]: false,
      } : prev);
      await fetchMe();
      toast.success("Usunięto");
    } catch {
      toast.error("Błąd usuwania");
    } finally {
      setDeleting(false);
    }
  }

  if (!s) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ustawienia</h1>
        <p className="text-gray-500 mt-1">Zarządzaj konfiguracją agencji</p>
      </div>

      {/* Plan */}
      <Section icon={CreditCard} title="Plan">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium capitalize">{s.plan}</span>
          {s.trialEndsAt && (
            <span className="text-sm text-gray-500">Trial do: {new Date(s.trialEndsAt).toLocaleDateString("pl-PL")}</span>
          )}
        </div>
      </Section>

      {/* Identyfikacja wizualna */}
      <Section icon={Palette} title="Identyfikacja wizualna">
        <div className="space-y-6">
          {/* Logo */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Logo agencji</p>
            <ImageUploader
              label="Logo" fieldName="logo"
              hint="Pojawia się w bocznym menu i raportach PDF. Zalecane: kwadratowe, min. 128×128 px. PNG, JPG, WebP, SVG · maks. 2 MB"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              maxKB={2048}
              currentUrl={s.logoUrl} hasFile={s.hasLogo}
              onUpload={(f) => uploadImage("logo", f, setUploadingLogo)}
              onDelete={() => deleteImage("logo", setDeletingLogo)}
              uploading={uploadingLogo} deleting={deletingLogo}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Favicon */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Favicon</p>
            <ImageUploader
              label="Favicon" fieldName="favicon"
              hint="Ikona w zakładce przeglądarki i portalu klienta. PNG 32×32 lub SVG · maks. 512 KB"
              accept="image/png,image/svg+xml,image/x-icon,image/webp"
              maxKB={512}
              currentUrl={s.faviconUrl} hasFile={s.hasFavicon}
              onUpload={(f) => uploadImage("favicon", f, setUploadingFavicon)}
              onDelete={() => deleteImage("favicon", setDeletingFavicon)}
              uploading={uploadingFavicon} deleting={deletingFavicon}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Kolor marki + tagline */}
          <form onSubmit={(e) => { e.preventDefault(); save({ brandColor, tagline }, setSavingVisual); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kolor marki" icon={Palette}>
                <div className="flex gap-2">
                  <input
                    type="color" value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-11 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text" value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    pattern="^#[0-9a-fA-F]{6}$"
                    className={`${inputCls} flex-1`}
                    placeholder="#4F46E5"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Używany w nagłówkach raportów PDF</p>
              </Field>

              <Field label="Tagline / Motto" icon={MessageSquare}>
                <input
                  type="text" value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className={inputCls} maxLength={200}
                  placeholder="Skuteczne SEO dla Twojego biznesu"
                />
                <p className="text-xs text-gray-400 mt-1">Pojawia się na okładce raportów PDF</p>
              </Field>
            </div>

            <button type="submit" disabled={savingVisual} className={btnPrimary}>
              {savingVisual ? "Zapisywanie..." : "Zapisz identyfikację wizualną"}
            </button>
          </form>
        </div>
      </Section>

      {/* Dane agencji */}
      <form onSubmit={(e) => { e.preventDefault(); save({ name: agencyName, website, phone, address, contactEmail, nip, regon, krs, bankAccount }, setSavingAgency); }}>
        <Section icon={Building2} title="Dane agencji">
          <p className="text-sm text-gray-500 -mt-3 mb-4">Widoczne w raportach PDF wysyłanych do klientów.</p>
          <div className="space-y-4">
            <Field label="Nazwa agencji" icon={Building2}>
              <input type="text" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={inputCls} required />
            </Field>

            <Field label="Strona internetowa" icon={Globe}>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://twojagencja.pl" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefon" icon={Phone}>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+48 123 456 789" />
              </Field>
              <Field label="Email kontaktowy" icon={Mail}>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} placeholder="kontakt@agencja.pl" />
              </Field>
            </div>

            <Field label="Adres" icon={MapPin}>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder={"ul. Przykładowa 1/2\n00-001 Warszawa"} />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="NIP" icon={Hash}>
                <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} className={inputCls} placeholder="1234567890" maxLength={13} />
              </Field>
              <Field label="REGON">
                <input type="text" value={regon} onChange={(e) => setRegon(e.target.value)} className={inputCls} placeholder="123456789" maxLength={14} />
              </Field>
              <Field label="KRS">
                <input type="text" value={krs} onChange={(e) => setKrs(e.target.value)} className={inputCls} placeholder="0000000000" maxLength={10} />
              </Field>
            </div>

            <Field label="Numer konta bankowego" icon={Landmark}>
              <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputCls} placeholder="PL 00 0000 0000 0000 0000 0000 0000" maxLength={50} />
            </Field>

            <button type="submit" disabled={savingAgency} className={btnPrimary}>
              {savingAgency ? "Zapisywanie..." : "Zapisz dane agencji"}
            </button>
          </div>
        </Section>
      </form>

      {/* Social media */}
      <form onSubmit={(e) => { e.preventDefault(); save({ socialLinkedin, socialFacebook, socialInstagram }, setSavingSocial); }}>
        <Section icon={Globe} title="Social media">
          <p className="text-sm text-gray-500 -mt-3 mb-4">Linki pojawiają się w stopce raportów PDF.</p>
          <div className="space-y-4">
            <Field label="LinkedIn" icon={Link}>
              <input type="url" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} className={inputCls} placeholder="https://linkedin.com/company/twoja-agencja" />
            </Field>
            <Field label="Facebook" icon={Link}>
              <input type="url" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} className={inputCls} placeholder="https://facebook.com/twoja-agencja" />
            </Field>
            <Field label="Instagram" icon={Link}>
              <input type="url" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} className={inputCls} placeholder="https://instagram.com/twoja-agencja" />
            </Field>
            <button type="submit" disabled={savingSocial} className={btnPrimary}>
              {savingSocial ? "Zapisywanie..." : "Zapisz social media"}
            </button>
          </div>
        </Section>
      </form>

      {/* Komunikacja */}
      <form onSubmit={(e) => { e.preventDefault(); save({ emailFooter }, setSavingComm); }}>
        <Section icon={MessageSquare} title="Komunikacja">
          <div className="space-y-4">
            <Field label="Stopka emaila" icon={Mail}>
              <textarea
                value={emailFooter} onChange={(e) => setEmailFooter(e.target.value)}
                rows={4} maxLength={1000}
                className={`${inputCls} resize-none`}
                placeholder={"Z poważaniem,\nZespół Agencji\ntel: +48 123 456 789 | kontakt@agencja.pl"}
              />
              <p className="text-xs text-gray-400 mt-1">Dołączana do każdego emaila wysyłanego do klientów. {emailFooter.length}/1000 znaków.</p>
            </Field>
            <button type="submit" disabled={savingComm} className={btnPrimary}>
              {savingComm ? "Zapisywanie..." : "Zapisz stopkę emaila"}
            </button>
          </div>
        </Section>
      </form>

      {/* Auto-raporty */}
      <form onSubmit={(e) => { e.preventDefault(); save({ autoReportEnabled: String(autoReportEnabled), autoReportDay: String(autoReportDay), autoReportEmail }, setSavingAutoReport); }}>
        <Section icon={Bell} title="Automatyczne raporty miesięczne">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Generuj automatycznie</p>
                <p className="text-xs text-gray-500 mt-0.5">Raporty są generowane co miesiąc w wybrany dzień</p>
              </div>
              <button type="button" onClick={() => setAutoReportEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${autoReportEnabled ? "bg-indigo-600" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoReportEnabled ? "translate-x-5 left-0.5" : "left-0.5"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Dzień miesiąca">
                <input type="number" min={1} max={28} value={autoReportDay}
                  onChange={(e) => setAutoReportDay(parseInt(e.target.value))}
                  className={inputCls} disabled={!autoReportEnabled} />
                <p className="text-xs text-gray-400 mt-1">1–28 każdego miesiąca</p>
              </Field>
              <Field label="Wyślij na email" icon={Mail}>
                <input type="email" value={autoReportEmail}
                  onChange={(e) => setAutoReportEmail(e.target.value)}
                  className={inputCls} placeholder="raporty@agencja.pl" disabled={!autoReportEnabled} />
              </Field>
            </div>

            <button type="submit" disabled={savingAutoReport} className={btnPrimary}>
              {savingAutoReport ? "Zapisywanie..." : "Zapisz ustawienia raportów"}
            </button>
          </div>
        </Section>
      </form>

      {/* Alerty widoczności */}
      <form onSubmit={(e) => { e.preventDefault(); save({ alertsEnabled: String(alertsEnabled), alertThreshold: String(alertThreshold), alertEmail }, setSavingAlerts); }}>
        <Section icon={Bell} title="Alerty spadku widoczności">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Powiadamiaj o spadkach</p>
                <p className="text-xs text-gray-500 mt-0.5">Email gdy widoczność TOP10 spada o podany próg procentowy</p>
              </div>
              <button type="button" onClick={() => setAlertsEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${alertsEnabled ? "bg-indigo-600" : "bg-gray-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alertsEnabled ? "translate-x-5 left-0.5" : "left-0.5"}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Próg alertu (%)">
                <input type="number" min={1} max={100} value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className={inputCls} disabled={!alertsEnabled} />
                <p className="text-xs text-gray-400 mt-1">Np. 10 = alert gdy TOP10 spada o 10%+</p>
              </Field>
              <Field label="Email alertów" icon={Mail}>
                <input type="email" value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className={inputCls} placeholder="alerty@agencja.pl" disabled={!alertsEnabled} />
              </Field>
            </div>

            <button type="submit" disabled={savingAlerts} className={btnPrimary}>
              {savingAlerts ? "Zapisywanie..." : "Zapisz ustawienia alertów"}
            </button>
          </div>
        </Section>
      </form>

      {/* Webhooks */}
      <Section icon={Webhook} title="Webhooks">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 -mt-3">Wysyłaj zdarzenia do zewnętrznych systemów (Zapier, Make, własny backend).</p>

          {/* List */}
          {!webhooks ? (
            <div className="h-12 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl text-sm text-gray-400">Brak skonfigurowanych webhooków</div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((wh: any) => (
                <div key={wh.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {wh.events.map((ev: string) => (
                          <span key={ev} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{ev}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {wh.isActive ? "Aktywny" : "Nieaktywny"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{wh.secret?.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={async () => {
                          setTestingWebhook(wh.id);
                          try {
                            const res = await api.post(`/webhooks/${wh.id}/test`);
                            toast[res.data.success ? "success" : "error"](res.data.success ? `Test OK (${res.data.statusCode})` : `Test nieudany (${res.data.statusCode ?? res.data.error})`);
                          } catch { toast.error("Błąd testu"); }
                          finally { setTestingWebhook(null); }
                        }}
                        disabled={testingWebhook === wh.id}
                        className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        {testingWebhook === wh.id ? "Testowanie..." : "Testuj"}
                      </button>
                      <button onClick={async () => {
                        try { await api.delete(`/webhooks/${wh.id}`); mutateWebhooks(); toast.success("Usunięto"); }
                        catch { toast.error("Błąd"); }
                      }} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Dodaj webhook</p>
            <input
              type="url" value={newWebhook.url}
              onChange={(e) => setNewWebhook((w) => ({ ...w, url: e.target.value }))}
              className={inputCls} placeholder="https://twoj-system.pl/webhook" />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Zdarzenia</p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS_LIST.map((ev) => {
                  const selected = newWebhook.events.includes(ev);
                  return (
                    <button key={ev} type="button"
                      onClick={() => setNewWebhook((w) => ({ ...w, events: selected ? w.events.filter((e) => e !== ev) : [...w.events, ev] }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      {ev}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={async () => {
                if (!newWebhook.url || newWebhook.events.length === 0) { toast.error("Podaj URL i wybierz co najmniej jedno zdarzenie"); return; }
                setSavingWebhook(true);
                try {
                  await api.post("/webhooks", newWebhook);
                  setNewWebhook({ url: "", events: [] });
                  mutateWebhooks();
                  toast.success("Webhook dodany");
                } catch (err: any) { toast.error(err.response?.data?.error ?? "Błąd"); }
                finally { setSavingWebhook(false); }
              }}
              disabled={savingWebhook}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />
              {savingWebhook ? "Dodawanie..." : "Dodaj webhook"}
            </button>
          </div>
        </div>
      </Section>

      {/* Integracje */}
      <form onSubmit={async (e) => {
        e.preventDefault();
        setSavingIntegrations(true);
        try {
          const body: Record<string, string> = {};
          if (senutoLogin && senutoPassword) { body.senutoLogin = senutoLogin; body.senutoPassword = senutoPassword; }
          if (geminiApiKey) body.geminiApiKey = geminiApiKey;
          if (Object.keys(body).length === 0) { toast.info("Brak zmian"); return; }
          await api.put("/settings", body);
          toast.success("Integracje zapisane");
          setSenutoLogin(""); setSenutoPassword(""); setGeminiApiKey("");
          await load();
        } catch (err: any) {
          toast.error(err.response?.data?.error ?? "Błąd zapisu");
        } finally {
          setSavingIntegrations(false);
        }
      }}>
        <Section icon={Settings} title="Integracje">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                <Key className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Senuto
              </p>
              {s.hasSenutoKey && <p className="text-xs text-green-600">✓ Token aktywny — Senuto połączone</p>}
              <input type="email" value={senutoLogin} onChange={(e) => setSenutoLogin(e.target.value)} placeholder="Login Senuto (email)" className={inputCls} />
              <input type="password" value={senutoPassword} onChange={(e) => setSenutoPassword(e.target.value)} placeholder={s.hasSenutoKey ? "Hasło (zostaw puste aby nie zmieniać)" : "Hasło Senuto"} className={inputCls} />
            </div>

            <div className="space-y-3 pt-1">
              <p className="text-sm font-medium text-gray-700">
                <BrainCircuit className="w-4 h-4 inline mr-1.5 text-gray-400" />
                Gemini API Key
              </p>
              {s.hasGeminiKey && <p className="text-xs text-green-600">✓ Klucz aktywny — AI Monitor gotowy</p>}
              <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder={s.hasGeminiKey ? "Zostaw puste aby nie zmieniać" : "AIzaSy..."} className={inputCls} />
            </div>

            <button type="submit" disabled={savingIntegrations} className={btnPrimary}>
              {savingIntegrations ? "Zapisywanie..." : "Zapisz integracje"}
            </button>
          </div>
        </Section>
      </form>
    </div>
  );
}
