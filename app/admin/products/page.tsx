'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../lib/toast';
import VariantEditor, { createEmptyVariantState, buildVariantPayloads, type VariantState } from '../../components/VariantEditor';

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

interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  subcategories?: Category[];
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const emptyForm = {
  name: '',
  sku: '',
  categoryId: '',
  subcategoryId: '',
  shortDescription: '',
  fullDescription: '',
  regularPrice: '',
  discountPercent: '0',
  stock: '0',
  trackInventory: true,
  lowStockThreshold: '5',
  featuredFlag: false,
  status: 'active' as 'active' | 'inactive',
};

interface ImageItem {
  file?: File;
  preview: string;
  serverId?: string;
  serverUrl?: string;
  uploading?: boolean;
  error?: string;
  sortOrder: number;
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [variantState, setVariantState] = useState<VariantState>(createEmptyVariantState);
  const [existingVariants, setExistingVariants] = useState<any[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInitializedRef = useRef(false);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      const res = await apiFetch<{ items: Product[] }>(`/api/admin/products?${params}`);
      setProducts(res.items);
    } catch {} finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch<{ items: Category[] }>('/api/admin/categories?limit=100');
      setCategories(res.items);
    } catch {}
  };

  useEffect(() => { fetchProducts(); }, [search, categoryFilter]);
  useEffect(() => { fetchCategories(); }, []);

  const editorInitedForRef = useRef<{ mode: string; id: string | null }>({ mode: '', id: null });
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const key = `${mode}:${editingId ?? ''}`;
    if (editorInitedForRef.current.mode === key) return;
    editorInitedForRef.current = { mode, id: editingId };
    if (mode === 'create') {
      el.innerHTML = '';
    } else if (mode === 'edit') {
      el.innerHTML = form.fullDescription || '';
    }
  }, [mode, editingId]);

  const computedDiscount = parseInt(form.discountPercent) || 0;
  const computedFinalPrice = form.regularPrice
    ? parseFloat(form.regularPrice) * (1 - computedDiscount / 100)
    : 0;

  const parentCategories = categories.filter((c) => c.parentCategoryId === null);
  const subcategories = categories.filter((c) => c.parentCategoryId === form.categoryId);

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;
    const newImages: ImageItem[] = Array.from(files).map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      sortOrder: images.length + i,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleImageRemove = (index: number) => {
    setImages((prev) => {
      const img = prev[index];
      if (img.preview && !img.serverUrl) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index).map((img, i) => ({ ...img, sortOrder: i }));
    });
  };

  const handleImageReorder = (from: number, to: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
  };

  const handleCreateSubcategory = async () => {
    if (!form.categoryId) { setPublishError('Select a parent category first'); return; }
    if (!newSubcategoryName.trim()) { setPublishError('Subcategory name is required'); return; }
    setCreatingSubcategory(true);
    try {
      const created = await apiFetch<Category>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newSubcategoryName.trim(), parentCategoryId: form.categoryId }),
      });
      setCategories((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, subcategoryId: created.id }));
      setNewSubcategoryName('');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to create subcategory');
    } finally {
      setCreatingSubcategory(false);
    }
  };

  const uploadImage = async (productId: string, item: ImageItem): Promise<boolean> => {
    if (!item.file) return true;
    setImages((prev) => prev.map((img, i) => i === item.sortOrder ? { ...img, uploading: true, error: undefined } : img));
    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('productId', productId);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/admin/media`, { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Upload failed');
      }
      const data = await res.json();
      setImages((prev) => prev.map((img, i) => i === item.sortOrder ? { ...img, serverId: data.id, serverUrl: data.url, uploading: false } : img));
      return true;
    } catch (err) {
      setImages((prev) => prev.map((img, i) => i === item.sortOrder ? { ...img, uploading: false, error: err instanceof Error ? err.message : 'Upload failed' } : img));
      return false;
    }
  };

  const handlePublish = async () => {
    setPublishError('');
    if (!form.name.trim()) { setPublishError('Product name is required'); return; }
    if (!form.sku.trim()) { setPublishError('SKU is required'); return; }
    if (!form.categoryId) { setPublishError('Category is required'); return; }
    if (!form.subcategoryId) { setPublishError('Subcategory is required'); return; }
    if (!form.regularPrice || parseFloat(form.regularPrice) <= 0) { setPublishError('Price must be greater than 0'); return; }

    setCreating(true);
    try {
      const variantsPayload = buildVariantPayloads(form.sku, parseFloat(form.regularPrice) || 0, variantState);

      const payload: any = {
        name: form.name,
        sku: form.sku,
        categoryId: form.subcategoryId,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription,
        regularPrice: parseFloat(form.regularPrice),
        discountEnabled: computedDiscount > 0,
        discountPercent: computedDiscount,
        stock: parseInt(form.stock) || 0,
        trackInventory: form.trackInventory,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        featuredFlag: form.featuredFlag,
        status: form.status,
      };

      let productId = mode === 'edit' && editingId ? editingId : null;

      if (mode === 'edit' && editingId) {
        payload.variants = variantsPayload.map((v, i) => {
          const existing = existingVariants.find(ev => ev.sku === v.sku);
          return { ...v, id: existing?.id };
        });
        await apiFetch(`/api/admin/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        payload.variants = variantsPayload;
        const product = await apiFetch<Product>('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        productId = product.id;
      }

      const fileImages = images.filter((img) => img.file && !img.serverUrl);
      if (fileImages.length > 0 && productId) {
        await Promise.all(fileImages.map((img) => uploadImage(productId!, img)));
      }

      setForm(emptyForm);
      setImages([]);
      setEditingId(null);
      setVariantState(createEmptyVariantState());
      setExistingVariants([]);
      setMode('list');
      fetchProducts();
      toast(mode === 'edit' ? 'Product updated successfully.' : 'Product added successfully.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : mode === 'edit' ? 'Failed to update product' : 'Failed to create product';
      setPublishError(msg);
      toast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nIf this product has orders, it will be deactivated instead.`)) return;
    try {
      const res = await apiFetch<{ deleted: boolean; soft: boolean; message?: string }>(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.soft) toast(res.message || 'Product deactivated (referenced by orders)', 'info');
      else toast('Product deleted.', 'success');
      fetchProducts();
    } catch { toast('Failed to delete product.', 'error'); }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    try {
      await apiFetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' }),
      });
      toast('Product status updated.', 'success');
      fetchProducts();
    } catch { toast('Failed to update status.', 'error'); }
  };

  const handleStockAdjust = async (id: string, newStock: number) => {
    try {
      await apiFetch(`/api/admin/stock/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: newStock, reason: 'Admin adjustment' }),
      });
      toast('Stock updated.', 'success');
      fetchProducts();
    } catch { toast('Failed to update stock.', 'error'); }
  };

  const handleEdit = async (product: Product) => {
    try {
      const full = await apiFetch<any>(`/api/admin/products/${product.id}`);
      const subId = full.categoryId;
      const subCat = categories.find((c) => c.id === subId);
      const parentId = subCat?.parentCategoryId || '';
      setForm({
        name: full.name,
        sku: full.sku,
        categoryId: parentId,
        subcategoryId: subId,
        shortDescription: full.shortDescription || '',
        fullDescription: full.fullDescription || '',
        regularPrice: String(full.regularPrice),
        discountPercent: String(full.discountPercent),
        stock: String(full.stock),
        trackInventory: full.trackInventory,
        lowStockThreshold: String(full.lowStockThreshold),
        featuredFlag: full.featuredFlag,
        status: full.status,
      });
      setImages(
        (full.images || []).map((img: any, i: number) => ({
          preview: img.url,
          serverId: img.id,
          serverUrl: img.url,
          sortOrder: img.sortOrder ?? i,
        }))
      );
      setEditingId(product.id);
      setMode('edit');
      await fetchVariantsIntoEditor(product.id, full.sku, parseFloat(String(full.regularPrice)) || 0);
    } catch { alert('Failed to load product for editing'); }
  };

  const fetchVariantsIntoEditor = async (productId: string, baseSku: string, basePrice: number) => {
    try {
      const res = await apiFetch<{ items: any[] }>(`/api/admin/products/${productId}/variants`);
      const existingVariantsList = res.items || [];
      setExistingVariants(existingVariantsList);

      const sizeNames = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL'];
      const sizes: { size: string; stock: number }[] = [];
      const colors: { name: string; sku: string; priceOverride: string; stock: number }[] = [];
      let otherSizeEnabled = false;
      let otherSizeLabel = '';

      for (const v of existingVariantsList) {
        const name: string = v.name || '';
        if (name.includes(' / ')) {
          const [sizePart, colorPart] = name.split(' / ').map((s: string) => s.trim());
          if (sizeNames.includes(sizePart)) {
            if (!sizes.find(s => s.size === sizePart)) {
              sizes.push({ size: sizePart, stock: v.stock || 0 });
            }
          } else if (sizePart.toLowerCase() === 'other') {
            otherSizeEnabled = true;
            otherSizeLabel = sizePart;
          }
          if (colorPart && !colors.find(c => c.name === colorPart)) {
            colors.push({ name: colorPart, sku: '', priceOverride: '', stock: v.stock || 0 });
          }
        } else if (sizeNames.includes(name)) {
          if (!sizes.find(s => s.size === name)) {
            sizes.push({ size: name, stock: v.stock || 0 });
          }
        } else if (name.toLowerCase() === 'other') {
          otherSizeEnabled = true;
          otherSizeLabel = name;
        } else {
          if (!colors.find(c => c.name === name)) {
            colors.push({ name: name, sku: '', priceOverride: '', stock: v.stock || 0 });
          }
        }
      }

      setVariantState({ sizes, otherSizeEnabled, otherSizeLabel, colors });
    } catch {
      setExistingVariants([]);
      setVariantState(createEmptyVariantState());
    }
  };

  if (mode === 'create' || mode === 'edit') {
    const primaryImage = images.length > 0 ? images[0] : null;
    return (
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <h1 style={{ fontSize: '1.5rem' }}>{mode === 'edit' ? 'Edit Product' : 'Add Product'}</h1>
          <button onClick={() => { setMode('list'); setForm(emptyForm); setImages([]); setEditingId(null); setVariantState(createEmptyVariantState()); setExistingVariants([]); }} style={{ padding: '8px 16px', background: 'var(--color-text-muted)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)' }}>
            Back to List
          </button>
        </div>

        <div className="grid-2" style={{ gap: 'var(--space-lg)', alignItems: 'start' }}>
          <div style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Product Editor</h2>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Images</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                    <img src={img.preview || img.serverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {img.uploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem' }}>...</div>}
                    {img.error && <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,53,69,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', padding: 2, textAlign: 'center' }}>{img.error}</div>}
                    <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2 }}>
                      {i > 0 && <button onClick={() => handleImageReorder(i, i - 1)} style={{ width: 16, height: 16, fontSize: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>↑</button>}
                      {i < images.length - 1 && <button onClick={() => handleImageReorder(i, i + 1)} style={{ width: 16, height: 16, fontSize: '0.6rem', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>↓</button>}
                    </div>
                    <button onClick={() => handleImageRemove(i)} style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, fontSize: '0.6rem', background: 'rgba(220,53,69,0.8)', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>×</button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} style={{ width: 80, height: 80, border: '2px dashed var(--color-border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>+</button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { handleImageAdd(e.target.files); e.target.value = ''; }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>JPEG, PNG, WebP. Max 2MB each. Max 8 images.</p>
            </div>

            <div className="grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>SKU *</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Category *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <option value="">Select category</option>
                  {parentCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Subcategory *</label>
                <select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} required disabled={!form.categoryId} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', opacity: form.categoryId ? 1 : 0.5 }}>
                  <option value="">Select subcategory</option>
                  {subcategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                {form.categoryId && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <input value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="New subcategory name" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSubcategory(); } }} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }} />
                    <button type="button" onClick={handleCreateSubcategory} disabled={creatingSubcategory || !newSubcategoryName.trim()} style={{ padding: '6px 12px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.8rem', cursor: creatingSubcategory || !newSubcategoryName.trim() ? 'not-allowed' : 'pointer', opacity: creatingSubcategory || !newSubcategoryName.trim() ? 0.5 : 1 }}>
                      {creatingSubcategory ? '...' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Price *</label>
                <input type="number" step="0.01" min="0" value={form.regularPrice} onChange={(e) => setForm({ ...form, regularPrice: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Discount %</label>
                <input type="number" min="0" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Stock</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Short Description</label>
              <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>Full Description</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <button type="button" onClick={() => document.execCommand('bold')} style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontWeight: 700 }} title="Bold">B</button>
                <button type="button" onClick={() => document.execCommand('italic')} style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontStyle: 'italic' }} title="Italic">I</button>
                <button type="button" onClick={() => document.execCommand('insertUnorderedList')} style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }} title="Bullet List">• List</button>
                <button type="button" onClick={() => document.execCommand('insertOrderedList')} style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }} title="Numbered List">1. List</button>
                <button type="button" onClick={() => { const url = prompt('Link URL:'); if (url) document.execCommand('createLink', false, url); }} style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }} title="Insert Link">Link</button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressHydrationWarning
                className="desc-editor"
                onInput={(e) => setForm({ ...form, fullDescription: e.currentTarget.innerHTML })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return;
                    let node: Node | null = sel.anchorNode;
                    while (node && node !== editorRef.current) {
                      if (node instanceof HTMLElement && node.tagName === 'LI') {
                        if (node.textContent?.trim() === '') {
                          e.preventDefault();
                          document.execCommand('outdent');
                          return;
                        }
                        return;
                      }
                      node = node.parentNode;
                    }
                  }
                }}
                style={{ width: '100%', minHeight: 120, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', outline: 'none', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.featuredFlag} onChange={(e) => setForm({ ...form, featuredFlag: e.target.checked })} /> Featured
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} /> Track Inventory
              </label>
            </div>

            <div style={{ marginBottom: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Variants (Size, Color, etc.)</h3>
              <VariantEditor
                baseSku={form.sku}
                basePrice={parseFloat(form.regularPrice) || 0}
                value={variantState}
                onChange={setVariantState}
              />
            </div>

            {publishError && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>{publishError}</p>}

            <button onClick={handlePublish} disabled={creating} style={{ width: '100%', padding: '12px', background: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? (mode === 'edit' ? 'Updating...' : 'Publishing...') : (mode === 'edit' ? 'Update Product' : 'Publish Product')}
            </button>
          </div>

          <div style={{ background: '#fff', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 20 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>Live Preview</h2>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {primaryImage ? (
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'var(--color-surface)' }}>
                  <img src={primaryImage.preview || primaryImage.serverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No image</div>
              )}
              <div style={{ padding: 'var(--space-md)' }}>
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {images.slice(0, 5).map((img, i) => (
                      <img key={i} src={img.preview || img.serverUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: i === 0 ? '2px solid var(--color-accent)' : '1px solid var(--color-border)' }} />
                    ))}
                    {images.length > 5 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>+{images.length - 5}</span>}
                  </div>
                )}
                <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{form.name || 'Product Name'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  {form.subcategoryId ? categories.find((c) => c.id === form.subcategoryId)?.name || (form.categoryId ? categories.find((c) => c.id === form.categoryId)?.name || 'Category' : 'Category') : form.categoryId ? categories.find((c) => c.id === form.categoryId)?.name || 'Category' : 'Category'}
                </p>
                {form.shortDescription && <p style={{ fontSize: '0.85rem', marginBottom: 8, color: 'var(--color-text-muted)' }}>{form.shortDescription}</p>}
                {form.fullDescription && (
                  <div className="preview-desc" style={{ fontSize: '0.85rem', marginBottom: 8, lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: form.fullDescription }} />
                )}
                <div style={{ marginBottom: 8 }}>
                  {computedDiscount > 0 && <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginRight: 8 }}>{formatTaka(parseFloat(form.regularPrice) || 0)}</span>}
                  <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{formatTaka(computedFinalPrice)}</span>
                  {computedDiscount > 0 && <span style={{ marginLeft: 8, padding: '2px 6px', background: 'rgba(220,53,69,0.1)', color: 'var(--color-danger)', borderRadius: 4, fontSize: '0.75rem' }}>-{computedDiscount}%</span>}
                </div>
                <p style={{ fontSize: '0.8rem', color: (parseInt(form.stock) || 0) === 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {(parseInt(form.stock) || 0) === 0 ? 'Out of Stock' : `In Stock: ${form.stock}`}
                </p>
                {form.featuredFlag && <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 8px', background: 'rgba(0,123,255,0.1)', color: '#007bff', borderRadius: 4, fontSize: '0.75rem' }}>Featured</span>}
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .preview-desc ul, .preview-desc ol { margin: 8px 0; padding-left: 24px; }
          .preview-desc ul { list-style-type: disc; }
          .preview-desc ol { list-style-type: decimal; }
          .preview-desc li { margin: 2px 0; }
          .preview-desc p { margin: 4px 0; }
          .desc-editor ul, .desc-editor ol { margin: 8px 0; padding-left: 24px; }
          .desc-editor ul { list-style-type: disc; }
          .desc-editor ol { list-style-type: decimal; }
          .desc-editor li { margin: 2px 0; }
        `}</style>
      </div>
    );
  }

  if (loading) return <p>Loading products...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Products</h1>
        <button onClick={() => setMode('create')} style={{ padding: '8px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
          Add Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', alignItems: 'center' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', maxWidth: 300, width: '100%' }} />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
          <option value="">All Categories</option>
          {parentCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
              <th style={{ padding: '10px 12px', fontSize: '0.85rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No products found</td></tr>
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
                  <span onClick={() => { const val = prompt('Set stock:', String(p.stock)); if (val !== null) handleStockAdjust(p.id, parseInt(val) || 0); }} style={{ cursor: 'pointer', color: p.stock === 0 ? 'var(--color-danger)' : p.stock <= 5 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {p.stock}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', background: p.status === 'active' ? 'rgba(40,167,69,0.1)' : 'rgba(108,117,125,0.1)', color: p.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                  <button onClick={() => handleEdit(p)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <label style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    Image
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('productId', p.id);
                      try {
                        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
                        await fetch(`${API_BASE}/api/admin/media`, { method: 'POST', credentials: 'include', body: formData });
                        fetchProducts();
                      } catch { alert('Upload failed'); }
                      e.target.value = '';
                    }} />
                  </label>
                  <button onClick={() => handleStatusToggle(p.id, p.status)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-border)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                    {p.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(p.id, p.name)} style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
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
