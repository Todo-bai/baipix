import { toastStore } from '../uiStore';

export function Toasts() {
  const toasts = toastStore.use((s) => s.toasts);
  const last = toasts[toasts.length - 1];
  return (
    <div className={`toast${last ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {last?.message}
    </div>
  );
}
