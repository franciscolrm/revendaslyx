'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[rgb(var(--background))]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[rgb(var(--foreground))]">
          Algo deu errado
        </h2>
        <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
