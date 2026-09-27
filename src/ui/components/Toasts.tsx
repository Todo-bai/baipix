import { dismissToast, toastStore } from '../uiStore';

export function Toasts() {
  const toasts = toastStore.use((s) => s.toasts);
  const last = toasts[toasts.length - 1];
  return (
    <div className={`toast${last ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {last?.message}
      {last?.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            dismissToast(last.id);
            last.action!.run();
          }}
        >
          {last.action.label}
        </button>
      )}
    </div>
  );
}
