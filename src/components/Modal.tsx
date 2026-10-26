import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface IModalProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export const Modal = ({ title, onClose, children }: IModalProps) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header class="sheet__header">
          <h2 id="modal-title">{title}</h2>
          <button ref={closeRef} type="button" class="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
};
