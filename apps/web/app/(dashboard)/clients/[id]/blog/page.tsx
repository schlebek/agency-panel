"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Plus, ExternalLink, Trash2, X, CheckCircle2, Clock, Send } from "lucide-react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type Brief = {
  id: string;
  title: string;
  briefUrl: string | null;
  status: "pending" | "sent" | "published";
  publishUrl: string | null;
  createdAt: string;
};

const STATUS_CONFIG = {
  pending: { label: "Oczekuje", icon: Clock, cls: "text-amber-600 bg-amber-50" },
  sent: { label: "Przesłany", icon: Send, cls: "text-blue-600 bg-blue-50" },
  published: { label: "Opublikowany", icon: CheckCircle2, cls: "text-green-600 bg-green-50" },
};

function AddBriefModal({ clientId, onClose, onSuccess }: { clientId: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", briefUrl: "", status: "pending" as Brief["status"], publishUrl: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/clients/${clientId}/blog`, {
        title: form.title,
        briefUrl: form.briefUrl || null,
        status: form.status,
        publishUrl: form.publishUrl || null,
      });
      toast.success("Brief dodany");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Dodaj brief</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tytuł / temat *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Np. 10 sposobów na..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link do briefu</label>
            <input name="briefUrl" type="url" value={form.briefUrl} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://docs.google.com/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="pending">Oczekuje</option>
              <option value="sent">Przesłany</option>
              <option value="published">Opublikowany</option>
            </select>
          </div>
          {form.status === "published" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Link do publikacji</label>
              <input name="publishUrl" type="url" value={form.publishUrl} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://example.com/blog/..." />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? "Dodawanie..." : "Dodaj brief"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditBriefModal({ brief, clientId, onClose, onSuccess }: { brief: Brief; clientId: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: brief.title,
    briefUrl: brief.briefUrl ?? "",
    status: brief.status,
    publishUrl: brief.publishUrl ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/clients/${clientId}/blog/${brief.id}`, {
        title: form.title,
        briefUrl: form.briefUrl || null,
        status: form.status,
        publishUrl: form.publishUrl || null,
      });
      toast.success("Brief zaktualizowany");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edytuj brief</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tytuł / temat *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link do briefu</label>
            <input name="briefUrl" type="url" value={form.briefUrl} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://docs.google.com/..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="pending">Oczekuje</option>
              <option value="sent">Przesłany</option>
              <option value="published">Opublikowany</option>
            </select>
          </div>
          {form.status === "published" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Link do publikacji</label>
              <input name="publishUrl" type="url" value={form.publishUrl} onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://example.com/blog/..." />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BlogPage() {
  const { id } = useParams<{ id: string }>();
  const { data: briefs, mutate } = useSWR<Brief[]>(`/clients/${id}/blog`, fetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Brief | null>(null);

  async function deleteBrief(briefId: string) {
    if (!confirm("Usunąć brief?")) return;
    try {
      await api.delete(`/clients/${id}/blog/${briefId}`);
      toast.success("Brief usunięty");
      mutate();
    } catch {
      toast.error("Błąd usuwania");
    }
  }

  const pending = briefs?.filter((b) => b.status === "pending").length ?? 0;
  const sent = briefs?.filter((b) => b.status === "sent").length ?? 0;
  const published = briefs?.filter((b) => b.status === "published").length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blog</h2>
          <p className="text-sm text-gray-400 mt-0.5">Briefy i artykuły klienta</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Dodaj brief
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Oczekuje", value: pending, icon: Clock, cls: "text-amber-600 bg-amber-50" },
          { label: "Przesłane", value: sent, icon: Send, cls: "text-blue-600 bg-blue-50" },
          { label: "Opublikowane", value: published, icon: CheckCircle2, cls: "text-green-600 bg-green-50" },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {!briefs ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Brak briefów. Dodaj pierwszy!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {briefs.map((brief) => {
            const cfg = STATUS_CONFIG[brief.status];
            const Icon = cfg.icon;
            return (
              <div key={brief.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{brief.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {brief.briefUrl && (
                      <a href={brief.briefUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" />
                        Brief
                      </a>
                    )}
                    {brief.publishUrl && (
                      <a href={brief.publishUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-500 hover:text-green-700 flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" />
                        Publikacja
                      </a>
                    )}
                    <span className="text-xs text-gray-300">
                      {new Date(brief.createdAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditing(brief)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => deleteBrief(brief.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddBriefModal
          clientId={id}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); mutate(); }}
        />
      )}
      {editing && (
        <EditBriefModal
          brief={editing}
          clientId={id}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); mutate(); }}
        />
      )}
    </div>
  );
}
