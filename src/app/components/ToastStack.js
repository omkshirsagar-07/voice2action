"use client";

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[999] flex w-full max-w-sm flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(function renderToast(toast) {
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={function dismissToast() {
                  onDismiss(toast.id);
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
