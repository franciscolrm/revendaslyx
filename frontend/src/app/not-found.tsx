import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[rgb(var(--background))]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--foreground))]">
          Pagina nao encontrada
        </h2>
        <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
          A pagina que voce procura nao existe ou foi movida.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
