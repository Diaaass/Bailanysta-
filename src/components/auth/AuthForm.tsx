"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { safeCallbackUrl } from "@/lib/utils";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "С возвращением",
    subtitle: "Войдите, чтобы читать ленту и писать посты.",
    submit: "Войти",
    switchText: "Ещё нет аккаунта?",
    switchLink: "Создать",
    switchHref: "/register",
  },
  register: {
    title: "Создайте аккаунт",
    subtitle: "Имя пользователя понадобится для входа и адреса профиля.",
    submit: "Создать аккаунт",
    switchText: "Уже зарегистрированы?",
    switchLink: "Войти",
    switchHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, displayName }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Не удалось создать аккаунт");
        }
      }

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Неверное имя пользователя или пароль");
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {copy.subtitle}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "register" ? (
          <Field
            id="displayName"
            label="Отображаемое имя"
            value={displayName}
            onChange={setDisplayName}
            autoComplete="name"
            placeholder="Айгерім Сәтбаева"
            required
          />
        ) : null}

        <Field
          id="username"
          label="Имя пользователя"
          value={username}
          onChange={(v) => setUsername(v.toLowerCase())}
          autoComplete="username"
          placeholder="aigerim"
          hint={mode === "register" ? "Латиница, цифры и подчёркивание" : undefined}
          required
        />

        <Field
          id="password"
          label="Пароль"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          hint={mode === "register" ? "Минимум 8 символов" : undefined}
          required
        />

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
        >
          {busy ? "Подождите…" : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-medium text-accent hover:underline">
          {copy.switchLink}
        </Link>
      </p>

      {mode === "login" ? (
        <p className="mt-8 border-t border-line pt-5 text-center text-[0.8125rem] leading-relaxed text-ink-faint">
          Для быстрого просмотра есть готовый аккаунт:
          <br />
          <span className="text-ink-muted">demo</span> — пароль{" "}
          <span className="text-ink-muted">demo1234</span>
        </p>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  hint,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="block text-[0.8125rem] font-medium text-ink">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-accent"
      />
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
