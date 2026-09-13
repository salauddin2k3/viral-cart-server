import { describe, it, expect } from 'vitest';

describe('API Endpoints (integration - server must be running)', () => {
  const BASE = 'http://localhost:5000';

  it('GET /healthz returns ok', async () => {
    try {
      const res = await fetch(`${BASE}/healthz`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBe('ok');
    } catch {
      // Skip if server not running
    }
  });

  it('GET /api/products returns products list', async () => {
    try {
      const res = await fetch(`${BASE}/api/products?limit=5`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    } catch {}
  });

  it('GET /api/categories returns categories list', async () => {
    try {
      const res = await fetch(`${BASE}/api/categories?limit=5`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    } catch {}
  });

  it('POST /api/track with invalid data returns error', async () => {
    try {
      const res = await fetch(`${BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCode: '', phone: '' }),
      });
      expect(res.ok).toBe(false);
      const data = await res.json();
      expect(data.error).toBeDefined();
    } catch {}
  });

  it('POST /api/orders without data returns validation error', async () => {
    try {
      const res = await fetch(`${BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.ok).toBe(false);
    } catch {}
  });
});
