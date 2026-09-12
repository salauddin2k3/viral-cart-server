'use client';

import { useCart } from '../lib/cart';
import Link from 'next/link';
import { useState } from 'react';

function formatTaka(amount: number): string {
  return `\u09F3${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, itemCount, subtotal } = useCart();
  const [isClearing, setIsClearing] = useState(false);

  if (items.length === 0) {
    return (
    <main className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
        <h1>Shopping Cart</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Your cart is empty.</p>
        <Link href="/all-products" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          Continue Shopping
        </Link>
      </main>
    );
  }

  const handleClear = () => {
    setIsClearing(true);
    clearCart();
  };

  return (
    <main className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
      <h1>Shopping Cart ({itemCount} items)</h1>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={handleClear}
          disabled={isClearing}
          style={{ color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Clear Cart
        </button>
      </div>

      <div className="table-wrap">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Product</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Unit Price</th>
            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
            <th style={{ padding: '0.5rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
            const lineTotal = discountedPrice * item.quantity;

            return (
              <tr key={`${item.productId}-${item.variantId ?? 'none'}`} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 56, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#999' }}>No img</div>
                      )}
                      <div>
                        <strong>{item.name}</strong>
                        {item.discountPercent > 0 && (
                          <span style={{ color: '#cc0000', marginLeft: 8 }}>
                            -{item.discountPercent}%
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  {item.stockSignal === 'out_of_stock' && (
                    <span style={{ color: '#cc0000', fontSize: '0.85rem' }}>Out of Stock</span>
                  )}
                  {item.stockSignal === 'low_stock' && (
                    <span style={{ color: '#cc8800', fontSize: '0.85rem' }}>Low Stock</span>
                  )}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      disabled={item.quantity <= 1}
                      style={{ width: 36, height: 36, cursor: 'pointer', fontSize: '1rem' }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: 30, textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      disabled={item.quantity >= 99}
                      style={{ width: 36, height: 36, cursor: 'pointer', fontSize: '1rem' }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  {item.discountPercent > 0 && (
                    <div style={{ textDecoration: 'line-through', color: '#999', fontSize: '0.85rem' }}>
                      {formatTaka(item.unitPrice)}
                    </div>
                  )}
                  <div>{formatTaka(discountedPrice)}</div>
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatTaka(lineTotal)}</td>
                <td style={{ padding: '0.5rem' }}>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    style={{ color: '#cc0000', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          <strong>Subtotal: {formatTaka(subtotal)}</strong>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Link
            href="/all-products"
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #ddd',
              borderRadius: 4,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            Continue Shopping
          </Link>
          <Link
            href="/checkout"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
