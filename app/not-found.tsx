import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="display text-5xl text-indigo">404</p>
      <p className="mt-3 text-ink/70">Paj sa a pa la. This page is not here.</p>
      <Link href="/" className="btn btn-gold mt-6">
        Ekilib
      </Link>
    </main>
  );
}
