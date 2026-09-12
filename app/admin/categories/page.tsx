'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  status: string;
  imageUrl: string | null;
  parentCategoryId: string | null;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', parentCategoryId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', parentCategoryId: '' });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await apiFetch<{ items: Category[] }>('/api/admin/categories?limit=100');
      setCategories(res.items);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || undefined,
          parentCategoryId: form.parentCategoryId || null,
        }),
      });
      setForm({ name: '', slug: '', parentCategoryId: '' });
      setShowCreate(false);
      fetchCategories();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to create category'); }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      await apiFetch(`/api/admin/categories/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' }),
      });
      fetchCategories();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to update status'); }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, slug: cat.slug, parentCategoryId: cat.parentCategoryId || '' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await apiFetch(`/api/admin/categories/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug || undefined,
          parentCategoryId: editForm.parentCategoryId || null,
        }),
      });
      setEditingId(null);
      fetchCategories();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to update category'); }
  };

  const handleDeleteClick = (cat: Category) => {
    setPageError(null);
    setDeleteTarget(cat);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setPageError(null);
    try {
      await apiFetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const parentCategories = categories.filter((c) => !c.parentCategoryId);

  if (loading) return <p>Loading categories...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Categories</h1>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
          {showCreate ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Slug (auto-generated if empty)</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Parent Category (leave empty for top-level)</label>
            <select
              value={form.parentCategoryId}
              onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="">None (Top-level category)</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)' }}>Create</button>
        </form>
      )}

      {pageError && (
        <div style={{ background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-lg)', color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{pageError}</span>
          <button onClick={() => setPageError(null)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', fontWeight: 700 }}>×</button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Name</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Slug</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Parent</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const parent = c.parentCategoryId ? categories.find((p) => p.id === c.parentCategoryId) : null;
              const isEditing = editingId === c.id;
              if (isEditing) {
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                    <td colSpan={5} style={{ padding: '10px 12px' }}>
                      <form onSubmit={handleUpdate} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label style={{ display: 'block', marginBottom: 2, fontSize: '0.75rem', fontWeight: 600 }}>Name</label>
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label style={{ display: 'block', marginBottom: 2, fontSize: '0.75rem', fontWeight: 600 }}>Slug</label>
                          <input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label style={{ display: 'block', marginBottom: 2, fontSize: '0.75rem', fontWeight: 600 }}>Parent</label>
                          <select value={editForm.parentCategoryId} onChange={(e) => setEditForm({ ...editForm, parentCategoryId: e.target.value })} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                            <option value="">None (Top-level)</option>
                            {parentCategories.filter((p) => p.id !== c.id).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="submit" style={{ padding: '6px 12px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: '#fff', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }
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
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => handleEdit(c)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => handleStatusToggle(c.id, c.status)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDeleteClick(c)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', borderRadius: 4, background: '#fff', color: 'var(--color-danger)', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => !deleting && setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', width: '100%', maxWidth: 420, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Delete Category</h3>
            <p style={{ margin: '12px 0 0', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--color-text)' }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
              Products in this category will be moved to &quot;Uncategorized&quot;. Subcategories will become top-level categories. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', fontSize: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: '#fff', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
