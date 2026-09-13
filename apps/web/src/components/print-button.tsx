"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm text-white hover:opacity-90"
    >
      Print / Save PDF
    </button>
  );
}
