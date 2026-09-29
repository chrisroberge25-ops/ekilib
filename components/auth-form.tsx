"use client";

import Link from "next/link";
import { useState } from "react";
import { loginAction, signupAction } from "@/lib/actions";
import { errorText, type Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";

export function LoginForm({
  dict,
  nextPath,
  demo,
}: {
  dict: Dictionary;
  nextPath: string;
  demo?: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(demo ? "demo@ekilib.app" : "");
  const [password, setPassword] = useState(demo ? "ekilib-demo" : "");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const result = await loginAction(data);
    if (result?.ok === false) setError(errorText(dict, result.error));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-md space-y-4 p-6">
      <h1 className="display text-3xl text-indigo">{dict.auth.loginTitle}</h1>
      <p className="text-sm text-ink/70">{dict.auth.demoHint}</p>
      <label className="block text-sm font-semibold">
        {dict.auth.email}
        <input className="field mt-1" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        {dict.auth.password}
        <input className="field mt-1" name="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <input type="hidden" name="next" value={nextPath} />
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {dict.auth.submitLogin}
      </button>
      <button
        className="btn btn-ghost w-full border-indigo/15 text-indigo"
        type="button"
        onClick={() => {
          setEmail("demo@ekilib.app");
          setPassword("ekilib-demo");
        }}
      >
        {dict.auth.useDemo}
      </button>
      <p className="text-sm">
        {dict.auth.noAccount}{" "}
        <Link href="/signup" className="font-semibold text-ocean">
          {dict.nav.signup}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await signupAction(new FormData(event.currentTarget));
    if (result?.ok === false) setError(errorText(dict, result.error));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="panel w-full max-w-md space-y-4 p-6">
      <h1 className="display text-3xl text-indigo">{dict.auth.signupTitle}</h1>
      <label className="block text-sm font-semibold">
        {dict.auth.name}
        <input className="field mt-1" name="name" required minLength={2} />
      </label>
      <label className="block text-sm font-semibold">
        {dict.auth.email}
        <input className="field mt-1" name="email" type="email" required />
      </label>
      <label className="block text-sm font-semibold">
        {dict.auth.password}
        <input className="field mt-1" name="password" type="password" required minLength={8} />
      </label>
      <input type="hidden" name="locale" value={locale} />
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {dict.auth.submitSignup}
      </button>
      <p className="text-sm">
        {dict.auth.hasAccount}{" "}
        <Link href="/login" className="font-semibold text-ocean">
          {dict.nav.login}
        </Link>
      </p>
    </form>
  );
}
