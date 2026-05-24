"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error?.name === "ChunkLoadError" || error?.message?.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Coś poszło nie tak</h2>
            <p className="text-sm text-gray-500 mb-4">Odśwież stronę, aby kontynuować.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
