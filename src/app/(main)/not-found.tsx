import Link from "next/link";

export default function MainNotFound() {
  return (
    <div className="px-4 py-16 lg:px-0">
      <div className="mx-auto max-w-[46ch] text-center">
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink">
          Здесь ничего нет
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
          Пост или профиль удалён, либо в ссылке опечатка. Поищите по ключевому
          слову — возможно, запись сохранилась под другим адресом.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            В ленту
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong"
          >
            Поиск
          </Link>
        </div>
      </div>
    </div>
  );
}
