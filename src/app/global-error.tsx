'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
          <button onClick={() => reset()} style={{ padding: '0.5rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
