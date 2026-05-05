"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    senutoProjectId: "",
    gscPropertyUrl: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      await api.post("/clients", payload);
      toast.success("Klient dodany pomyślnie");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd dodawania klienta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Dodaj klienta</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwa klienta *</label>
            <input name="name" value={form.name} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Np. Sklep ABC" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Domena *</label>
            <input name="domain" value={form.domain} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email kontaktowy</label>
            <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="klient@example.com" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Integracje (opcjonalnie)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ID projektu Senuto</label>
                <input name="senutoProjectId" value={form.senutoProjectId} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="np. 12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL właściwości GSC</label>
                <input name="gscPropertyUrl" value={form.gscPropertyUrl} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://example.com/" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Anuluj
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? "Dodawanie..." : "Dodaj klienta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
