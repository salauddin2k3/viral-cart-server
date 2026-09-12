'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart, CartItem } from '../lib/cart';
import { useToast } from '../lib/toast';

function formatTaka(amount: number): string {
  return `\u09F3${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const API_BASE = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000') : '';

interface DeliverySettings {
  insideDhakaNormal: number;
  dhakaSubNormal: number;
  outsideDhakaNormal: number;
  insideDhakaExpress: number;
  expressEnabled: boolean;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  return crypto.randomUUID();
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, buyNowItem, updateBuyNowQuantity, clearBuyNow } = useCart();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', phone: '', districtArea: '', address: '', note: '' });
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'dhaka_sub' | 'outside_dhaka'>('inside_dhaka');
  const [deliveryMethod, setDeliveryMethod] = useState<'normal' | 'express'>('normal');
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [saving, setSaving] = useState(false);
  const sessionIdRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBuyNow = buyNowItem !== null;
  const checkoutItems: CartItem[] = isBuyNow ? [buyNowItem!] : items;
  const checkoutSubtotal = isBuyNow
    ? buyNowItem!.unitPrice * (1 - buyNowItem!.discountPercent / 100) * buyNowItem!.quantity
    : subtotal;

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/delivery`)
      .then((r) => r.json())
      .then((data: DeliverySettings) => setDeliverySettings(data))
      .catch(() => {});
  }, []);

  const deliveryCharge = (() => {
    if (!deliverySettings) return 0;
    if (deliveryLocation === 'outside_dhaka') return deliverySettings.outsideDhakaNormal;
    if (deliveryLocation === 'dhaka_sub') return deliverySettings.dhakaSubNormal;
    if (deliveryMethod === 'express' && deliverySettings.expressEnabled) return deliverySettings.insideDhakaExpress;
    return deliverySettings.insideDhakaNormal;
  })();

  const orderTotal = checkoutSubtotal + deliveryCharge;

  const autosave = useCallback(async (fieldOverrides?: Record<string, unknown>) => {
    if (!sessionIdRef.current || checkoutItems.length === 0) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          name: form.name,
          phone: form.phone,
          districtArea: form.districtArea,
          address: form.address,
          note: form.note,
          deliveryMethod,
          ...fieldOverrides,
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            quantity: item.quantity,
          })),
        }),
      });
    } catch {
      // silently fail autosave
    } finally {
      setSaving(false);
    }
  }, [checkoutItems, form.name, form.phone, form.districtArea, form.address, form.note, deliveryMethod]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        autosave({ [field]: value });
      }, 3000);
      return next;
    });
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const handleBlur = (field: keyof typeof form) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    autosave({ [field]: form[field] });
  };

  const handleDeliveryLocationChange = (loc: 'inside_dhaka' | 'dhaka_sub' | 'outside_dhaka') => {
    setDeliveryLocation(loc);
    if (loc === 'outside_dhaka' || loc === 'dhaka_sub') {
      setDeliveryMethod('normal');
    }
    autosave({ deliveryLocation: loc, deliveryMethod: (loc === 'outside_dhaka' || loc === 'dhaka_sub') ? 'normal' : deliveryMethod });
  };

  const handleDeliveryMethodChange = (method: 'normal' | 'express') => {
    setDeliveryMethod(method);
    autosave({ deliveryMethod: method });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.name.length > 120) errs.name = 'Name must be at most 120 characters';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^(\+88|88)?01[3-9]\d{8}$/.test(form.phone.replace(/\D/g, ''))) errs.phone = 'Invalid Bangladesh phone number';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (form.address.length > 500) errs.address = 'Address must be at most 500 characters';
    if (form.note.length > 1000) errs.note = 'Note must be at most 1000 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || checkoutItems.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          districtArea: form.districtArea,
          address: form.address,
          note: form.note,
          deliveryLocation,
          deliveryMethod,
          sessionId: sessionIdRef.current,
          items: checkoutItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            quantity: item.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? body?.error?.message ?? 'Failed to place order');
      }

      const order = await res.json();
      if (isBuyNow) {
        clearBuyNow();
      } else {
        clearCart();
      }
      localStorage.removeItem('ecomm_checkout_session');
      toast('অর্ডার সফলভাবে দেওয়া হয়েছে!', 'success');
      router.push(`/confirmation?orderNumber=${order.orderNumber}&trackingCode=${order.trackingCode}`);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to place order' });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="container" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
        <h2>Your cart is empty</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Add some items before checking out.</p>
      </div>
    );
  }

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>{isBuyNow ? 'Buy Now' : 'Checkout'}</h1>
        {saving && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Saving...</span>}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Customer Name *</label>
          <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} onBlur={() => handleBlur('name')} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.name ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)' }} />
          {errors.name && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: 4 }}>{errors.name}</p>}
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Mobile Number *</label>
          <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={() => handleBlur('phone')} placeholder="01XXXXXXXXX" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.phone ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)' }} />
          {errors.phone && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: 4 }}>{errors.phone}</p>}
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>District/Area</label>
          <input value={form.districtArea} onChange={(e) => handleChange('districtArea', e.target.value)} onBlur={() => handleBlur('districtArea')} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Full Address *</label>
          <textarea value={form.address} onChange={(e) => handleChange('address', e.target.value)} onBlur={() => handleBlur('address')} rows={3} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.address ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
          {errors.address && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: 4 }}>{errors.address}</p>}
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Additional Note</label>
          <textarea value={form.note} onChange={(e) => handleChange('note', e.target.value)} onBlur={() => handleBlur('note')} rows={2} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${errors.note ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
          {errors.note && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: 4 }}>{errors.note}</p>}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Delivery Location *</h2>
          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `1px solid ${deliveryLocation === 'inside_dhaka' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: deliveryLocation === 'inside_dhaka' ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : '#fff', flex: 1 }}>
              <input type="radio" name="deliveryLocation" value="inside_dhaka" checked={deliveryLocation === 'inside_dhaka'} onChange={() => handleDeliveryLocationChange('inside_dhaka')} style={{ accentColor: 'var(--color-accent)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Inside Dhaka</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Charge: {deliverySettings ? formatTaka(deliverySettings.insideDhakaNormal) : '...'}</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `1px solid ${deliveryLocation === 'dhaka_sub' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: deliveryLocation === 'dhaka_sub' ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : '#fff', flex: 1 }}>
              <input type="radio" name="deliveryLocation" value="dhaka_sub" checked={deliveryLocation === 'dhaka_sub'} onChange={() => handleDeliveryLocationChange('dhaka_sub')} style={{ accentColor: 'var(--color-accent)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dhaka Sub</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Charge: {deliverySettings ? formatTaka(deliverySettings.dhakaSubNormal) : '...'}</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `1px solid ${deliveryLocation === 'outside_dhaka' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: deliveryLocation === 'outside_dhaka' ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : '#fff', flex: 1 }}>
              <input type="radio" name="deliveryLocation" value="outside_dhaka" checked={deliveryLocation === 'outside_dhaka'} onChange={() => handleDeliveryLocationChange('outside_dhaka')} style={{ accentColor: 'var(--color-accent)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Outside Dhaka</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Charge: {deliverySettings ? formatTaka(deliverySettings.outsideDhakaNormal) : '...'}</div>
              </div>
            </label>
          </div>

          {deliveryLocation === 'inside_dhaka' && deliverySettings?.expressEnabled && (
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Delivery Method</label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 14px', border: `1px solid ${deliveryMethod === 'normal' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: deliveryMethod === 'normal' ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : '#fff' }}>
                  <input type="radio" name="deliveryMethod" value="normal" checked={deliveryMethod === 'normal'} onChange={() => handleDeliveryMethodChange('normal')} style={{ accentColor: 'var(--color-accent)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Normal ({formatTaka(deliverySettings.insideDhakaNormal)})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 14px', border: `1px solid ${deliveryMethod === 'express' ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', background: deliveryMethod === 'express' ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : '#fff' }}>
                  <input type="radio" name="deliveryMethod" value="express" checked={deliveryMethod === 'express'} onChange={() => handleDeliveryMethodChange('express')} style={{ accentColor: 'var(--color-accent)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Express ({formatTaka(deliverySettings.insideDhakaExpress)})</span>
                </label>
              </div>
            </div>
          )}
          {deliveryLocation === 'inside_dhaka' && !deliverySettings?.expressEnabled && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Express delivery is currently unavailable.</p>
          )}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Order Summary</h2>
          {checkoutItems.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? 'none'}`} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span>{formatTaka(item.unitPrice * (1 - item.discountPercent / 100) * item.quantity)}</span>
              </div>
              {isBuyNow ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Qty:</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <button type="button" onClick={() => updateBuyNowQuantity(item.quantity - 1)} disabled={item.quantity <= 1} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', opacity: item.quantity <= 1 ? 0.5 : 1 }}>-</button>
                    <span style={{ padding: '4px 8px', minWidth: 30, textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                    <button type="button" onClick={() => updateBuyNowQuantity(item.quantity + 1)} disabled={item.quantity >= 99} style={{ padding: '4px 8px', border: 'none', background: 'none', cursor: item.quantity >= 99 ? 'not-allowed' : 'pointer', opacity: item.quantity >= 99 ? 0.5 : 1 }}>+</button>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTaka(item.unitPrice * (1 - item.discountPercent / 100))} each</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Qty: {item.quantity}</div>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 8 }}>
            <span>Subtotal</span>
            <span>{formatTaka(checkoutSubtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 6 }}>
            <span>Delivery Charge</span>
            <span>{formatTaka(deliveryCharge)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span>{formatTaka(orderTotal)}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 8 }}>Payment: Cash on Delivery</p>
        </div>

        {errors.submit && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>{errors.submit}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
