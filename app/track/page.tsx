'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TrackingResult {
  found: boolean;
  multiple?: boolean;
  orders?: Array<{
    orderNumber: string;
    date: string;
    items: Array<{ name: string; quantity: number; lineTotal: number }>;
    total: number;
    currentStatus: string;
    customerStatus: string;
    timeline: Array<{ status: string; customerStatus: string; date: string }>;
  }>;
  orderNumber?: string;
  date?: string;
  items?: Array<{ name: string; quantity: number; lineTotal: number }>;
  total?: number;
  currentStatus?: string;
  customerStatus?: string;
  timeline?: Array<{ status: string; customerStatus: string; date: string }>;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function OrderTimeline({ timeline }: { timeline: TrackingResult['timeline'] }) {
  if (!timeline || timeline.length === 0) return null;
  return (
    <div>
      <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>স্ট্যাটাস টাইমলাইন</h3>
      <div style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: 'var(--space-md)' }}>
        {timeline.map((entry, i) => (
          <div key={i} style={{ marginBottom: 'var(--space-md)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', background: i === timeline.length - 1 ? 'var(--color-accent)' : 'var(--color-border)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{entry.customerStatus}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {new Date(entry.date).toLocaleString('bn-BD')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: NonNullable<TrackingResult['orders']>[0] }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1.05rem' }}>অর্ডার {order.orderNumber}</h3>
        <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.8rem', background: 'var(--color-accent)', color: '#fff' }}>
          {order.customerStatus}
        </span>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
        অর্ডারের তারিখ: {new Date(order.date).toLocaleDateString('bn-BD')}
      </p>
      {order.items && (
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
              <span>{item.name} x {item.quantity}</span>
              <span>{formatTaka(item.lineTotal)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>মোট</span>
            <span>{formatTaka(order.total)}</span>
          </div>
        </div>
      )}
      <OrderTimeline timeline={order.timeline} />
    </div>
  );
}

export default function TrackOrderPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackMode, setTrackMode] = useState<'orderNumber' | 'trackingCode' | 'phone'>('orderNumber');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      const body: Record<string, string> = {};
      if (trackMode === 'orderNumber' && orderNumber.trim()) body.orderNumber = orderNumber.trim();
      if (trackMode === 'trackingCode' && trackingCode.trim()) body.trackingCode = trackingCode.trim();
      if (trackMode === 'phone' && phone.trim()) body.phone = phone.trim();
      if (trackMode === 'trackingCode' && phone.trim()) body.phone = phone.trim();

      const res = await fetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message);
      } else {
        setResult(data);
      }
    } catch {
      setError('অর্ডার ট্র্যাক করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>আপনার অর্ডার ট্র্যাক করুন</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {[
          { key: 'orderNumber' as const, label: 'অর্ডার নম্বর' },
          { key: 'trackingCode' as const, label: 'ট্র্যাকিং কোড' },
          { key: 'phone' as const, label: 'ফোন নম্বর' },
        ].map((mode) => (
          <button
            key={mode.key}
            type="button"
            onClick={() => { setTrackMode(mode.key); setResult(null); setError(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: trackMode === mode.key ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
              background: trackMode === mode.key ? 'var(--color-accent)' : '#fff',
              color: trackMode === mode.key ? '#fff' : 'inherit',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleTrack} style={{ marginBottom: 'var(--space-2xl)' }}>
        {trackMode === 'orderNumber' && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>অর্ডার নম্বর</label>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="#100001"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        )}

        {trackMode === 'trackingCode' && (
          <>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>ট্র্যাকিং কোড</label>
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>ফোন নম্বর (ঐচ্ছিক)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </>
        )}

        {trackMode === 'phone' && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>ফোন নম্বর</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              এই ফোন নম্বরের সব অর্ডার দেখানো হবে
            </p>
          </div>
        )}

        {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600 }}
        >
          {loading ? 'খুঁজছি...' : 'অর্ডার ট্র্যাক করুন'}
        </button>
      </form>

      {result && !result.found && (
        <div style={{ textAlign: 'center', padding: 'var(--space-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>কোনো অর্ডার পাওয়া যায়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।</p>
        </div>
      )}

      {result && result.found && result.multiple && result.orders && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>{result.orders.length}টি অর্ডার পাওয়া গেছে</h2>
          {result.orders.map((order, i) => (
            <OrderCard key={i} order={order} />
          ))}
        </div>
      )}

      {result && result.found && !result.multiple && result.orderNumber && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '1.1rem' }}>অর্ডার {result.orderNumber}</h2>
            <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: '0.8rem', background: 'var(--color-accent)', color: '#fff' }}>
              {result.customerStatus}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            অর্ডারের তারিখ: {result.date ? new Date(result.date).toLocaleDateString('bn-BD') : ''}
          </p>

          {result.items && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 8 }}>পণ্য</h3>
              {result.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                  <span>{item.name} x {item.quantity}</span>
                  <span>{formatTaka(item.lineTotal)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>মোট</span>
                <span>{formatTaka(result.total || 0)}</span>
              </div>
            </div>
          )}

          <OrderTimeline timeline={result.timeline} />
        </div>
      )}

      <div style={{ marginTop: 'var(--space-2xl)', textAlign: 'center' }}>
        <Link href="/" style={{ color: 'var(--color-accent)' }}>হোম পেজে ফিরুন</Link>
      </div>
    </div>
  );
}
