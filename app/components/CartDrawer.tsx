'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { useCart } from '../lib/cart';

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, itemCount, subtotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, handleEsc]);

  if (!mounted) return null;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            transition: 'opacity 0.25s',
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 360,
          maxWidth: '85vw',
          height: '100vh',
          background: '#fff',
          zIndex: 1000,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cart ({itemCount})</h2>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <p style={{ fontSize: '0.95rem', marginBottom: 4 }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Add some items to get started.</p>
            </div>
          ) : (
            items.map((item) => {
              const lineTotal = item.unitPrice * (1 - item.discountPercent / 100) * item.quantity;

              return (
                <div key={`${item.productId}-${item.variantId ?? 'none'}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, background: 'var(--color-surface)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>No img</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/product/${item.slug}`} onClick={onClose} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {formatTaka(item.unitPrice * (1 - item.discountPercent / 100))} each
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          disabled={item.quantity <= 1}
                          style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: item.quantity <= 1 ? 0.4 : 1 }}
                        >-</button>
                        <span style={{ minWidth: 32, textAlign: 'center', fontSize: '0.85rem' }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          disabled={item.quantity >= 99}
                          style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: item.quantity >= 99 ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: item.quantity >= 99 ? 0.4 : 1 }}
                        >+</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatTaka(lineTotal)}</span>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.75rem', padding: 2 }}
                          aria-label="Remove item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)', background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontWeight: 600 }}>
              <span>Subtotal</span>
              <span>{formatTaka(subtotal)}</span>
            </div>
            <Link
              href="/cart"
              onClick={onClose}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-accent)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: 8,
              }}
            >
              View Cart
            </Link>
            <Link
              href="/checkout"
              onClick={onClose}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
