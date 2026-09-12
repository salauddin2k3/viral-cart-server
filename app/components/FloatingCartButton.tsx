'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../lib/cart';

interface FloatingCartButtonProps {
  onClick: () => void;
}

export default function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="floating-cart-btn"
      aria-label={`Open cart (${itemCount} items)`}
      style={{
        position: 'fixed',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      {itemCount > 0 && (
        <span style={{
          position: 'absolute',
          top: -4,
          right: -4,
          background: 'var(--color-accent)',
          color: '#fff',
          borderRadius: '50%',
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          fontWeight: 700,
        }}>
          {itemCount}
        </span>
      )}
      <style>{`
        .floating-cart-btn:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.3);
          transform: translateY(-50%) scale(1.05);
        }
        .floating-cart-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-cart-btn { transition: none !important; }
        }
        @media (max-width: 768px) {
          .floating-cart-btn { right: 12px; width: 46px; height: 46px; }
        }
      `}</style>
    </button>
  );
}
