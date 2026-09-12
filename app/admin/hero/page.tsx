'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../lib/toast';

const MAX_SLIDES = 10;

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  ctaEnabled: boolean;
  ctaText: string;
  ctaUrl: string;
  sortOrder: number;
  active: boolean;
}

const emptySlide: Omit<HeroSlide, 'id' | 'sortOrder'> = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaEnabled: false,
  ctaText: '',
  ctaUrl: '',
  active: true,
};

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptySlide);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchSlides = async () => {
    try {
      const res = await apiFetch<{ items: HeroSlide[] }>('/api/admin/hero');
      setSlides(res.items);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchSlides(); }, []);

  const atLimit = slides.length >= MAX_SLIDES && !editing;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl || null,
        ctaEnabled: form.ctaEnabled,
        ctaText: form.ctaEnabled ? form.ctaText : null,
        ctaUrl: form.ctaEnabled ? form.ctaUrl : null,
        active: form.active,
      };
      if (editing) {
        await apiFetch(`/api/admin/hero/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/admin/hero', { method: 'POST', body: JSON.stringify(payload) });
      }
      setEditing(null);
      setForm(emptySlide);
      fetchSlides();
      toast(editing ? 'Slide updated!' : 'Slide created!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/admin/hero-upload`, { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch { alert('Upload failed'); }
    e.target.value = '';
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete slide "${title}"?`)) return;
    try {
      await apiFetch(`/api/admin/hero/${id}`, { method: 'DELETE' });
      fetchSlides();
      toast('Slide deleted!', 'success');
    } catch { alert('Failed to delete'); }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= slides.length) return;
    const newSlides = [...slides];
    const [moved] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, moved);
    setSlides(newSlides);
    try {
      await apiFetch('/api/admin/hero/reorder', {
        method: 'PUT',
        body: JSON.stringify({ slideIds: newSlides.map((s) => s.id) }),
      });
    } catch { fetchSlides(); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await apiFetch(`/api/admin/hero/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !current }),
      });
      fetchSlides();
    } catch { alert('Failed to update'); }
  };

  if (loading) return <p>Loading hero slides...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Hero Slides</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{slides.length} of {MAX_SLIDES} slides used</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(emptySlide); }}
          disabled={atLimit}
          style={{ padding: '8px 16px', background: atLimit ? 'var(--color-text-muted)' : 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, opacity: atLimit ? 0.5 : 1, cursor: atLimit ? 'not-allowed' : 'pointer' }}
        >
          Add Slide
        </button>
      </div>

      <div style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>{editing ? 'Edit Slide' : 'New Slide'}</h2>

        <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Subtitle</label>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: '#fff', cursor: 'pointer' }}>
              Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
            {form.imageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={form.imageUrl} alt="" style={{ width: 120, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border)' }} />
                <button onClick={() => setForm({ ...form, imageUrl: '' })} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Remove</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-md)', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.ctaEnabled}
              onChange={(e) => setForm({ ...form, ctaEnabled: e.target.checked, ctaText: e.target.checked ? form.ctaText : '', ctaUrl: e.target.checked ? form.ctaUrl : '' })}
              style={{ width: 16, height: 16 }}
            />
            Enable CTA Button
          </label>
          {form.ctaEnabled && (
            <div className="grid-2" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Button Text *</label>
                <input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="e.g. Shop Now" style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Button URL *</label>
                <input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
        </div>

        {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ padding: '10px 20px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, opacity: saving || !form.title.trim() ? 0.5 : 1 }}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(emptySlide); }} style={{ padding: '10px 20px', background: 'var(--color-text-muted)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>#</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Image</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Title</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>CTA</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slides.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No slides yet</td></tr>
            )}
            {slides.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ padding: '10px 12px' }}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 80, height: 45, background: 'var(--color-surface)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>No img</div>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.title}</div>
                  {s.subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.subtitle}</div>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {s.ctaEnabled ? (
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(40,167,69,0.1)', color: 'var(--color-success)' }}>
                      {s.ctaText || 'CTA'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: s.active ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: s.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {s.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {i > 0 && <button onClick={() => handleReorder(i, i - 1)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Up</button>}
                  {i < slides.length - 1 && <button onClick={() => handleReorder(i, i + 1)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Down</button>}
                  <button onClick={() => handleToggleActive(s.id, s.active)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    {s.active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => { setEditing(s.id); setForm({ title: s.title, subtitle: s.subtitle, imageUrl: s.imageUrl || '', ctaEnabled: s.ctaEnabled, ctaText: s.ctaText || '', ctaUrl: s.ctaUrl || '', active: s.active }); }} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s.id, s.title)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
