import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { useT } from '../../i18n';

interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Called on submit (Enter / primary button). */
  onSubmit?: () => void;
  submitLabel?: string;
  /** Hide the cancel button (informational dialogs). */
  hideCancel?: boolean;
}

/** Modal based on the native <dialog> element (focus trap and Escape for free). */
export function Dialog({ title, children, onClose, onSubmit, submitLabel, hideCancel }: DialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (!el.open) el.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
    onClose();
  };
  return (
    <dialog ref={ref} className="dialog">
      <form onSubmit={submit}>
        <div className="dialog-header">{title}</div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-footer">
          {!hideCancel && (
            <button type="button" className="btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
          )}
          <button type="submit" className="btn btn-primary" autoFocus={hideCancel}>
            {submitLabel ?? t('common.ok')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
