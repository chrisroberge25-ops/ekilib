"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel p-6">
      <h1 className="display text-3xl text-indigo">Gen yon pwoblèm</h1>
      <p className="mt-2 text-sm text-ink/70">Something went wrong while loading this page.</p>
      <button type="button" className="btn btn-gold mt-4" onClick={reset}>
        Eseye ankò
      </button>
    </div>
  );
}
