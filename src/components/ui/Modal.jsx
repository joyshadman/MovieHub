import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import Button, { IconButton } from './Button';

// Accessible dialog: Escape closes, focus moves in on open and back on close, Tab stays inside.
export const Modal = ({ open, onClose, title, children, className = 'max-w-md', labelledBy, hideClose = false }) => {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusables = () =>
      panel ? [...panel.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled) : [];
    const first = focusables()[0];
    (first || panel)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.();
      if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const [start, end] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === start) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); start.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 font-body">
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <Motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy || (title ? 'modal-title' : undefined)}
            tabIndex={-1}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            className={`relative w-full bg-sheet border border-line rounded-sheet shadow-card p-6 sm:p-8 ${className}`}
          >
            {!hideClose && (
              <IconButton label="Close" variant="plain" size="sm" onClick={onClose} className="absolute top-4 right-4 z-10">
                <X size={18} aria-hidden="true" />
              </IconButton>
            )}
            {title && <h2 id="modal-title" className="text-xl font-semibold text-white pr-10 mb-2">{title}</h2>}
            {children}
          </Motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading = false }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-sm text-muted mb-6">{message}</p>
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
    </div>
  </Modal>
);

export default Modal;
