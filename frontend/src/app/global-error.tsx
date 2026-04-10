'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            Erro inesperado
          </h2>
          <p style={{ color: '#666' }}>
            Ocorreu um erro grave na aplicacao.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
