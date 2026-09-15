"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/Modal";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();

  return (
    <Modal title={title} titleId={titleId} onClose={onCancel}>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
        {description}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Удаление…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
