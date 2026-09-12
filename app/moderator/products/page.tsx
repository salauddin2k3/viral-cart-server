'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Product {
  id: string;
  name: string;
  sku: string;
  slug: string;
  regularPrice: number;
  finalPrice: number;
  discountPercent: number;
  discountEnabled: boolean;
  stock: number;
  status: string;
  category: { id: string; name: string };
  images: Array<{ id: string; url: string; sortOrder: number }>;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function ModeratorProductsPage() {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const canView = hasPermission('PRODUCTS_VIEW');
  const canToggleStatus = hasPermission('PRODUCTS_TOGGLE_STATUS');

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      const res = await apiFetch<{ items: Product[] }>(`/api/admin/products?${params}`);
      setProducts(res.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Access denied'); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchProducts();
  }, [search, canView]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await apiFetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus === 'active' ? 'draft' : 'active' }),
      });
      fetchProducts();
    } catch { alert('Failed to update status'); }
  };

  if (loading) return <p>Loading products...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!canView) return <p>You do not have permission to view products.</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Products</h1>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxWidth: 300, width: '100%' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Product</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>SKU</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Price</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Stock</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              {canToggleStatus && <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={canToggleStatus ? 6 : 5} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No products found</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.images[0] && <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{p.category.name}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{p.sku}</td>
                <td style={{ padding: '10px 12px' }}>
                  {p.discountEnabled && <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{formatTaka(p.regularPrice)}</span>}
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatTaka(p.finalPrice)}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ color: p.stock === 0 ? 'var(--color-danger)' : p.stock <= 5 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {p.stock}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: p.status === 'active' ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: p.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {p.status}
                  </span>
                </td>
                {canToggleStatus && (
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleToggleStatus(p.id, p.status)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                      {p.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
