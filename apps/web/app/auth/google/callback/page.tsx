"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
      setStatus("error");
      window.opener?.postMessage({ type: "gsc-auth-error" }, window.location.origin);
      setTimeout(() => window.close(), 2000);
      return;
    }

    try {
      const { clientId } = JSON.parse(atob(state));
      api.post(`/gsc/${clientId}/auth-callback`, { code })
        .then(() => {
          setStatus("success");
          window.opener?.postMessage({ type: "gsc-auth-success", clientId }, window.location.origin);
          setTimeout(() => window.close(), 1500);
        })
        .catch(() => {
          setStatus("error");
          setTimeout(() => window.close(), 2000);
        });
    } catch {
      setStatus("error");
      setTimeout(() => window.close(), 2000);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl p-8 text-center shadow-md max-w-sm w-full">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Łączenie z Google...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold">Połączono pomyślnie!</p>
            <p className="text-gray-400 text-sm mt-1">Okno zamknie się automatycznie</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold">Błąd autoryzacji</p>
            <p className="text-gray-400 text-sm mt-1">Okno zamknie się automatycznie</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
