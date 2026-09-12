'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../lib/toast';
import ConfirmModal from '../../components/ConfirmModal';

interface Product {
  id: string;
  name: string;
  slug: string;
  finalPrice: number;
  images: { url: string }[];
}

interface LandingPageItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  template: string;
  active: boolean;
  isPrewritten: boolean;
  heroImageUrl: string | null;
  metaDescription: string | null;
  impressions: number;
  conversions: number;
  product: Product | null;
  content: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
}

interface ContentSection {
  id: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
}

const TEMPLATES = [
  { value: 'design_a', label: 'Product Sales', desc: 'Hero → Intro → Benefits → Features → Details → Social Proof → CTA' },
  { value: 'design_b', label: 'Problem / Solution', desc: 'Hero → Problem → Solution → Benefits → Showcase → Why Us → CTA' },
  { value: 'design_c', label: 'Premium Showcase', desc: 'Large Hero → Highlights → Gallery → Features → Benefits → Testimonials → CTA' },
] as const;

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero Section' },
  { type: 'benefits', label: 'Benefits' },
  { type: 'features', label: 'Features' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'gallery', label: 'Product Gallery' },
  { type: 'cta', label: 'Call to Action' },
  { type: 'faq', label: 'FAQ' },
  { type: 'custom', label: 'Custom HTML' },
];

const emptySections: ContentSection[] = [
  { id: 'sec_hero', type: 'hero', enabled: true, sortOrder: 0, data: { heading: '', subheading: '', text: '' } },
  { id: 'sec_benefits', type: 'benefits', enabled: true, sortOrder: 1, data: { title: 'Why Choose This Product', items: ['', '', ''] } },
  { id: 'sec_features', type: 'features', enabled: true, sortOrder: 2, data: { title: 'Key Features', items: ['', '', ''] } },
  { id: 'sec_testimonials', type: 'testimonials', enabled: true, sortOrder: 3, data: { title: 'What Our Customers Say', items: [{ name: '', text: '', rating: 5 }] } },
  { id: 'sec_cta', type: 'cta', enabled: true, sortOrder: 4, data: { heading: 'Order Now', text: '', buttonText: 'Order Now' } },
];

const btnBase: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '0.8rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--color-accent)',
  color: '#fff',
  borderColor: 'var(--color-accent)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.85rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontWeight: 600,
  fontSize: '0.85rem',
};

export default function AdminLandingPagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingPage, setEditingPage] = useState<LandingPageItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState<{ type: string; data?: LandingPageItem } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    productId: '',
    template: 'design_a' as 'design_a' | 'design_b' | 'design_c',
    heroImageUrl: '',
    metaDescription: '',
    active: false,
  });
  const [sections, setSections] = useState<ContentSection[]>(emptySections);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'seo'>('basic');

  const fetchPages = async () => {
    try {
      const res = await apiFetch<{ items: LandingPageItem[] }>('/api/admin/landing-pages?limit=100');
      setPages(res.items);
    } catch { toast('Failed to load landing pages', 'error'); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch<{ items: Product[] }>('/api/admin/products?limit=200&status=active');
      setProducts(res.items);
    } catch {}
  };

  useEffect(() => { fetchPages(); fetchProducts(); }, []);

  const resetForm = () => {
    setForm({ title: '', slug: '', subtitle: '', productId: '', template: 'design_a', heroImageUrl: '', metaDescription: '', active: false });
    setSections(emptySections);
    setFormErrors({});
    setEditingPage(null);
    setActiveTab('basic');
  };

  const validateForm = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.productId) errs.productId = 'A product must be linked';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/admin/landing-page-upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setForm((f) => ({ ...f, heroImageUrl: data.url }));
      toast('Image uploaded', 'success');
    } catch { toast('Image upload failed', 'error'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const openEditor = (page?: LandingPageItem) => {
    if (page) {
      setEditingPage(page);
      const contentSections = ((page.content as Record<string, unknown>)?.sections as ContentSection[]) || emptySections;
      setForm({
        title: page.title,
        slug: page.slug,
        subtitle: page.subtitle || '',
        productId: page.product?.id || '',
        template: page.template as 'design_a' | 'design_b' | 'design_c',
        heroImageUrl: page.heroImageUrl || '',
        metaDescription: page.metaDescription || '',
        active: page.active,
      });
      setSections(contentSections.length > 0 ? contentSections : emptySections);
    } else {
      resetForm();
    }
    setActiveTab('basic');
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setProcessing(true);
    try {
      const body = {
        ...form,
        productId: form.productId || null,
        heroImageUrl: form.heroImageUrl || null,
        metaDescription: form.metaDescription || null,
        slug: form.slug || undefined,
        sections,
      };

      if (editingPage) {
        await apiFetch(`/api/admin/landing-pages/${editingPage.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast('Landing page updated', 'success');
      } else {
        await apiFetch('/api/admin/landing-pages', { method: 'POST', body: JSON.stringify(body) });
        toast('Landing page created', 'success');
      }
      setShowCreate(false);
      resetForm();
      fetchPages();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally { setProcessing(false); }
  };

  const handleDelete = async (page: LandingPageItem) => {
    setPending({ type: 'delete', data: page });
  };

  const handleDuplicate = async (page: LandingPageItem) => {
    try {
      await apiFetch(`/api/admin/landing-pages/${page.id}/duplicate`, { method: 'POST' });
      toast('Landing page duplicated', 'success');
      fetchPages();
    } catch { toast('Failed to duplicate', 'error'); }
  };

  const executeAction = async () => {
    if (!pending || processing) return;
    setProcessing(true);
    try {
      if (pending.type === 'delete' && pending.data) {
        await apiFetch(`/api/admin/landing-pages/${pending.data.id}`, { method: 'DELETE' });
        toast('Landing page deleted', 'success');
        fetchPages();
      }
    } catch (err) { toast(err instanceof Error ? err.message : 'Action failed', 'error'); }
    finally { setProcessing(false); setPending(null); }
  };

  const updateSection = (index: number, data: Record<string, unknown>) => {
    setSections((prev) => prev.map((s, i) => i === index ? { ...s, data } : s));
  };

  const toggleSection = (index: number) => {
    setSections((prev) => prev.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s));
  };

  if (loading) return <p>Loading landing pages...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Landing Pages</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { window.open('/admin/preview/landing-page', '_blank'); }} style={{ ...btnBase, fontSize: '0.85rem' }}>Preview Latest</button>
          <button onClick={() => { resetForm(); setShowCreate(!showCreate); }} style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            {showCreate ? 'Cancel' : 'Create Landing Page'}
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)' }}>
            {([
              { key: 'basic' as const, label: 'Basic Info' },
              { key: 'content' as const, label: 'Content Sections' },
              { key: 'seo' as const, label: 'SEO / Meta' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  background: activeTab === tab.key ? 'var(--color-surface)' : '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 'var(--space-lg)' }}>
            {/* ── Basic Info Tab ── */}
            {activeTab === 'basic' && (
              <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ ...inputStyle, borderColor: formErrors.title ? 'var(--color-danger)' : 'var(--color-border)' }} placeholder="e.g. Summer Sale - 50% Off" />
                  {formErrors.title && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.title}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Slug (auto-generated)</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={inputStyle} placeholder="auto-generated-from-title" />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle</label>
                  <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} style={inputStyle} placeholder="Supporting headline" />
                </div>
                <div>
                  <label style={labelStyle}>Template *</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {TEMPLATES.map((t) => (
                      <button key={t.value} type="button" onClick={() => setForm({ ...form, template: t.value })} style={form.template === t.value ? btnActive : btnBase} title={t.desc}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{TEMPLATES.find((t) => t.value === form.template)?.desc}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Linked Product *</label>
                  <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} style={{ ...inputStyle, borderColor: formErrors.productId ? 'var(--color-danger)' : 'var(--color-border)' }}>
                    <option value="">-- Select a product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({`\u09F3`}{Number(p.finalPrice).toFixed(0)})</option>
                    ))}
                  </select>
                  {formErrors.productId && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{formErrors.productId}</span>}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Hero Image</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ ...btnBase, fontSize: '0.8rem' }}>{uploading ? 'Uploading...' : 'Upload Image'}</button>
                    {form.heroImageUrl && <img src={form.heroImageUrl} alt="Hero preview" style={{ height: 40, borderRadius: 4, objectFit: 'cover' }} />}
                    {form.heroImageUrl && <button type="button" onClick={() => setForm({ ...form, heroImageUrl: '' })} style={{ ...btnBase, fontSize: '0.75rem', color: 'var(--color-danger)' }}>Remove</button>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Content Sections Tab ── */}
            {activeTab === 'content' && (
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-sm)' }}>Content Sections</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>Customize the content for each section. Toggle sections on/off. Drag is not needed — order is fixed per template.</p>

                {sections.map((sec, idx) => (
                  <div key={sec.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: sec.enabled ? 'var(--color-surface)' : '#fafafa', borderBottom: sec.enabled ? '1px solid var(--color-border)' : 'none' }}>
                      <button type="button" onClick={() => toggleSection(idx)} style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid var(--color-border)', background: sec.enabled ? 'var(--color-success)' : '#fff', color: '#fff', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sec.enabled ? '✓' : ''}
                      </button>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', opacity: sec.enabled ? 1 : 0.5 }}>
                        {SECTION_TYPES.find((s) => s.type === sec.type)?.label || sec.type}
                      </span>
                    </div>
                    {sec.enabled && (
                      <div style={{ padding: '10px 12px' }}>
                        {sec.type === 'hero' && (
                          <div className="grid-2" style={{ gap: 8 }}>
                            <div>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Heading</label>
                              <input value={(sec.data.heading as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, heading: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem' }} placeholder="Main headline" />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Subheading</label>
                              <input value={(sec.data.subheading as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, subheading: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem' }} placeholder="Supporting text" />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Body Text</label>
                              <textarea value={(sec.data.text as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, text: e.target.value })} rows={2} style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical' }} placeholder="Additional hero text" />
                            </div>
                          </div>
                        )}
                        {(sec.type === 'benefits' || sec.type === 'features' || sec.type === 'faq') && (
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Section Title</label>
                            <input value={(sec.data.title as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, title: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem', marginBottom: 6 }} placeholder="Section heading" />
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Items (one per line)</label>
                            <textarea
                              value={((sec.data.items as string[]) || []).join('\n')}
                              onChange={(e) => updateSection(idx, { ...sec.data, items: e.target.value.split('\n').filter(Boolean) })}
                              rows={4}
                              style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical' }}
                              placeholder={"Benefit 1\nBenefit 2\nBenefit 3"}
                            />
                          </div>
                        )}
                        {sec.type === 'testimonials' && (
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Section Title</label>
                            <input value={(sec.data.title as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, title: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem', marginBottom: 6 }} />
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Testimonials (JSON: [{`{name, text, rating}`}])</label>
                            <textarea
                              value={JSON.stringify(sec.data.items || [], null, 2)}
                              onChange={(e) => { try { updateSection(idx, { ...sec.data, items: JSON.parse(e.target.value) }); } catch {} }}
                              rows={4}
                              style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical', fontFamily: 'monospace' }}
                            />
                          </div>
                        )}
                        {sec.type === 'cta' && (
                          <div className="grid-2" style={{ gap: 8 }}>
                            <div>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>CTA Heading</label>
                              <input value={(sec.data.heading as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, heading: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem' }} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Button Text</label>
                              <input value={(sec.data.buttonText as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, buttonText: e.target.value })} style={{ ...inputStyle, fontSize: '0.8rem' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Body Text</label>
                              <textarea value={(sec.data.text as string) || ''} onChange={(e) => updateSection(idx, { ...sec.data, text: e.target.value })} rows={2} style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical' }} />
                            </div>
                          </div>
                        )}
                        {sec.type === 'gallery' && (
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Uses product images automatically. Add extra image URLs (one per line):</label>
                            <textarea
                              value={((sec.data.urls as string[]) || []).join('\n')}
                              onChange={(e) => updateSection(idx, { ...sec.data, urls: e.target.value.split('\n').filter(Boolean) })}
                              rows={3}
                              style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical' }}
                              placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                            />
                          </div>
                        )}
                        {sec.type === 'custom' && (
                          <div>
                            <label style={{ ...labelStyle, fontSize: '0.75rem' }}>Custom HTML Content</label>
                            <textarea
                              value={(sec.data.html as string) || ''}
                              onChange={(e) => updateSection(idx, { ...sec.data, html: e.target.value })}
                              rows={5}
                              style={{ ...inputStyle, fontSize: '0.8rem', resize: 'vertical', fontFamily: 'monospace' }}
                              placeholder="<p>Your custom HTML here</p>"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── SEO / Meta Tab ── */}
            {activeTab === 'seo' && (
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-sm)' }}>SEO / Meta</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>Control how this landing page appears in search engines and social media.</p>
                <div style={{ maxWidth: 600 }}>
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <label style={labelStyle}>Meta Description</label>
                    <textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={3} style={inputStyle} placeholder="Description for search engines and social sharing (max 160 chars recommended)" maxLength={500} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{form.metaDescription.length}/500</p>
                  </div>
                  <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Preview</p>
                    <p style={{ fontSize: '0.85rem', color: '#1a0dab', marginBottom: 2 }}>{form.title || 'Page Title'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#006621', marginBottom: 2 }}>yourdomain.com/lp/{form.slug || 'page-slug'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#545454' }}>{form.metaDescription || 'No meta description set yet.'}</p>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-lg)', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Publish (make publicly accessible)
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={() => { setPreviewUrl(`/landing/${form.slug || 'preview'}`); }} style={{ ...btnBase }}>Preview</button>
                <button onClick={handleSubmit} disabled={processing} style={{ padding: '8px 20px', background: form.active ? 'var(--color-success)' : 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer' }}>
                  {processing ? 'Saving...' : editingPage ? 'Update' : form.active ? 'Create & Publish' : 'Save as Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Title</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Slug</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Template</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Product</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Stats</th>
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>No landing pages yet. Create one to get started.</td></tr>
            ) : pages.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                  {p.title}
                  {p.isPrewritten && (
                    <span style={{ display: 'inline-block', marginLeft: 6, padding: '1px 6px', borderRadius: 8, fontSize: '0.65rem', background: 'rgba(111,66,193,0.1)', color: '#6f42c1', fontWeight: 600, verticalAlign: 'middle' }}>
                      Pre-written
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>/lp/{p.slug}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: 'rgba(0,123,255,0.1)', color: '#007bff' }}>
                    {TEMPLATES.find((t) => t.value === p.template)?.label || p.template}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{p.product?.name ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: p.active ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: p.active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {p.active ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {p.impressions} views / {p.conversions} orders
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <button onClick={() => openEditor(p)} style={{ ...btnBase, fontSize: '0.75rem' }}>Edit</button>
                  {p.active && <a href={`/lp/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, fontSize: '0.75rem', textDecoration: 'none' }}>View</a>}
                  <button onClick={() => handleDuplicate(p)} style={{ ...btnBase, fontSize: '0.75rem' }}>Duplicate</button>
                  <button onClick={() => handleDelete(p)} style={{ ...btnBase, fontSize: '0.75rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {previewUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)' }} onClick={() => setPreviewUrl(null)}>
          <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 501 }}>
            <button onClick={() => setPreviewUrl(null)} style={{ padding: '8px 16px', background: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Close Preview</button>
          </div>
          <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} title="Preview" />
        </div>
      )}

      {pending && (
        <ConfirmModal
          open
          title="Delete Landing Page?"
          description={`Permanently remove "${pending.data?.title}". This cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="var(--color-danger)"
          loading={processing}
          loadingLabel="Deleting..."
          onConfirm={executeAction}
          onCancel={() => { if (!processing) setPending(null); }}
          details={[{ label: 'Slug', value: pending.data?.slug ?? '' }]}
        />
      )}
    </div>
  );
}
