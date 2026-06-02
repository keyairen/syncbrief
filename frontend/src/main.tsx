import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-cyan-300">
          SyncBrief MVP
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn scattered updates into concise team briefs.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          React, Express, Supabase, and OpenAI are ready for the first product workflow.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
