'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');
  const trackingCode = searchParams.get('trackingCode');

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl)', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>&#10003;</div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>Order Placed Successfully!</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
        Thank you for your order. We will contact you shortly to confirm.
      </p>

      {orderNumber && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Order Number: </span>
            <strong>{orderNumber}</strong>
          </div>
          {trackingCode && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Tracking Code: </span>
              <strong style={{ userSelect: 'all' }}>{trackingCode}</strong>
            </div>
          )}
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Status: </span>
            <strong>New</strong>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
        Please save your tracking code. You can use it along with your phone number to track your order.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ padding: '10px 24px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          Continue Shopping
        </Link>
        <Link href="/track" style={{ padding: '10px 24px', background: 'var(--color-accent)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
          Track Order
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 'var(--space-2xl)' }}><p>Loading...</p></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
