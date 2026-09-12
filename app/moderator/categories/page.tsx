'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Category {
  id: string;
  name: string;
  slug: string;
  status: string;
  imageUrl: string | null;
  parentCategoryId: string | null;
}

export default function ModeratorCategoriesPage() {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canView = hasPermission('CATEGORIES_VIEW');
  const canUpdate = hasPermission('CATEGORIES_UPDATE');

  const fetchCategories = async () => {
    try {
      const res = await apiFetch<{ items: Category[] }>('/api/admin/categories?limit=100');
      setCategories(res.items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Access denied'); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchCategories();
  }, [canView]);

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      await apiFetch(`/api/admin/categories/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' }),
      });
      fetchCategories();
    } catch { alert('Failed to update status'); }
  };

  if (loading) return <p>Loading categories...</p>;
  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!canView) return <p>You do not have permission to view categories.</p>;

  const parentCategories = categories.filter((c) => !c.parentCategoryId);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Categories</h1>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Name</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Slug</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Parent</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              {canUpdate && <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const parent = c.parentCategoryId ? categories.find((p) => p.id === c.parentCategoryId) : null;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, paddingLeft: c.parentCategoryId ? 28 : 12 }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{c.slug}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {parent ? parent.name : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: c.status === 'active' ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: c.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {c.status}
                    </span>
                  </td>
                  {canUpdate && (
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => handleStatusToggle(c.id, c.status)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
