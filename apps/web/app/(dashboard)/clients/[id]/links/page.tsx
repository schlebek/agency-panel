"use client";
import { useState, useRef } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Upload, Download, Trash2, Link2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatNumber, getMonthName } from "@/lib/utils";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const NOW = new Date();

export default function LinksPage() {
  const { id } = useParams<{ id: string }>();
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [linksCount, setLinksCount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, mutate } = useSWR(`/links?clientId=${id}&year=${year}&month=${month}`, fetcher);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", id);
      formData.append("year", String(year));
      formData.append("month", String(month));
      if (description) formData.append("description", description);
      if (linksCount) formData.append("linksCount", linksCount);

      await api.post("/links/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Plik wgrany pomyślnie");
      setDescription("");
      setLinksCount("");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Błąd wgrywania");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(fileId: string, filename: string) {
    try {
      const { data } = await api.get(`/links/${fileId}/download`);
      const a = document.createElement("a");
      a.href = data.url;
      a.download = filename;
      a.click();
    } catch {
      toast.error("Błąd pobierania");
    }
  }

  async function handleDelete(fileId: string) {
    try {
      await api.delete(`/links/${fileId}`);
      toast.success("Plik usunięty");
      mutate();
    } catch {
      toast.error("Błąd usuwania");
    }
  }

  const years = Array.from({ length: 3 }, (_, i) => NOW.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const totalLinks = data?.reduce((acc: number, f: any) => acc + (f.linksCount ?? 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pliki z linkami</h2>
          {totalLinks > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{formatNumber(totalLinks)} linków łącznie w tym miesiącu</p>
          )}
        </div>
      </div>

      {/* Period + upload */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex gap-3 mb-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {months.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opis pliku (opcjonalnie)"
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            value={linksCount}
            onChange={(e) => setLinksCount(e.target.value)}
            type="number"
            min="0"
            placeholder="Liczba linków"
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <label className={`flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload className="w-4 h-4" />
          {uploading ? "Wgrywanie..." : `Wgraj plik za ${getMonthName(month)} ${year}`}
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleUpload} />
        </label>
        <p className="text-xs text-gray-400 mt-2">Obsługiwane formaty: CSV, XLSX, XLS, TXT</p>
      </div>

      {/* Files list */}
      {!data ? (
        <div className="text-center text-gray-400 py-8">Ładowanie...</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Brak plików za {getMonthName(month)} {year}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((file: any) => (
            <div key={file.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {file.linksCount != null && (
                    <span className="text-xs text-gray-500">{formatNumber(file.linksCount)} linków</span>
                  )}
                  {file.description && (
                    <span className="text-xs text-gray-400">{file.description}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(file.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(file.id, file.filename)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Pobierz"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
