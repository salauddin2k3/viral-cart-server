import { describe, it, expect } from 'vitest';
import { checkoutPayloadSchema } from '../src/lib/validate';

describe('Checkout Validation (PRD §54 scenarios)', () => {
  const validCheckout = {
    name: 'Test Customer',
    phone: '01712345678',
    address: '123 Test Street, Dhaka',
    items: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Product',
        unitPrice: 500,
        discountPercent: 0,
        quantity: 2,
      },
    ],
  };

  it('accepts valid checkout payload', () => {
    const result = checkoutPayloadSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 120 chars', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, name: 'x'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid BD phone', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects address over 500 chars', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, address: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 60 cart lines', () => {
    const items = Array.from({ length: 61 }, (_, i) => ({
      productId: '550e8400-e29b-41d4-a716-446655440000',
      name: `Product ${i}`,
      unitPrice: 100,
      discountPercent: 0,
      quantity: 1,
    }));
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, items });
    expect(result.success).toBe(false);
  });

  it('rejects negative unit price', () => {
    const result = checkoutPayloadSchema.safeParse({
      ...validCheckout,
      items: [{ ...validCheckout.items[0], unitPrice: -100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = checkoutPayloadSchema.safeParse({
      ...validCheckout,
      items: [{ ...validCheckout.items[0], quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects discount over 100%', () => {
    const result = checkoutPayloadSchema.safeParse({
      ...validCheckout,
      items: [{ ...validCheckout.items[0], discountPercent: 101 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects note over 1000 chars', () => {
    const result = checkoutPayloadSchema.safeParse({ ...validCheckout, note: 'x'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});
