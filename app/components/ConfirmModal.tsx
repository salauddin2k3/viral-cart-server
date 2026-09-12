'use client';

import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  details?: Array<{ label: string; value: string }>;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmColor = 'var(--color-danger)',
  loading = false,
  loadingLabel,
  onConfirm,
  onCancel,
  details,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={!loading ? onCancel : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          maxWidth: 440,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h2
          id="confirm-modal-title"
          style={{ fontSize: '1.15rem', marginBottom: 'var(--space-sm)', fontWeight: 700 }}
        >
          {title}
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          {description}
        </p>

        {details && details.length > 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            {details.map((d) => (
              <div key={d.label} style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                <strong>{d.label}:</strong> {d.value}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 4,
              background: loading ? 'var(--color-text-muted)' : confirmColor,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              minWidth: 100,
            }}
          >
            {loading ? (loadingLabel || 'Processing...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
