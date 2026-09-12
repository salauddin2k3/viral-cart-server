'use client';

import { useState } from 'react';

const PRESET_SIZES = ['M', 'L', 'XL', 'XXL'] as const;

function normalizeSku(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export interface SizeVariant {
  size: string;
  stock: number;
}

export interface ColorVariant {
  name: string;
  sku: string;
  priceOverride: string;
  stock: number;
}

export interface VariantState {
  sizes: SizeVariant[];
  otherSizeLabel: string;
  otherSizeEnabled: boolean;
  colors: ColorVariant[];
}

export function createEmptyVariantState(): VariantState {
  return {
    sizes: [],
    otherSizeLabel: '',
    otherSizeEnabled: false,
    colors: [],
  };
}

export function buildVariantPayloads(
  baseSku: string,
  basePrice: number,
  state: VariantState,
): Array<{ name: string; sku: string; regularPrice: number; stock: number; sortOrder: number }> {
  const variants: Array<{ name: string; sku: string; regularPrice: number; stock: number; sortOrder: number }> = [];
  let sortOrder = 0;

  const hasSizes = state.sizes.length > 0 || state.otherSizeEnabled;
  const hasColors = state.colors.length > 0;

  if (hasSizes && hasColors) {
    for (const sv of state.sizes) {
      for (const cv of state.colors) {
        const sizeLabel = sv.size;
        const colorLabel = cv.name;
        const colorSkuPart = cv.sku ? normalizeSku(cv.sku) : normalizeSku(colorLabel);
        const price = cv.priceOverride ? parseFloat(cv.priceOverride) || basePrice : basePrice;
        variants.push({
          name: `${sizeLabel} / ${colorLabel}`,
          sku: `${normalizeSku(baseSku)}-${normalizeSku(sizeLabel)}-${colorSkuPart}`,
          regularPrice: price,
          stock: sv.stock,
          sortOrder: sortOrder++,
        });
      }
    }
  } else if (hasSizes) {
    for (const sv of state.sizes) {
      variants.push({
        name: sv.size,
        sku: `${normalizeSku(baseSku)}-${normalizeSku(sv.size)}`,
        regularPrice: basePrice,
        stock: sv.stock,
        sortOrder: sortOrder++,
      });
    }
  } else if (hasColors) {
    for (const cv of state.colors) {
      const colorSkuPart = cv.sku ? normalizeSku(cv.sku) : normalizeSku(cv.name);
      const price = cv.priceOverride ? parseFloat(cv.priceOverride) || basePrice : basePrice;
      variants.push({
        name: cv.name,
        sku: `${normalizeSku(baseSku)}-${colorSkuPart}`,
        regularPrice: price,
        stock: cv.stock,
        sortOrder: sortOrder++,
      });
    }
  }

  return variants;
}

interface VariantEditorProps {
  baseSku: string;
  basePrice: number;
  value: VariantState;
  onChange: (state: VariantState) => void;
}

export default function VariantEditor({ baseSku, basePrice, value, onChange }: VariantEditorProps) {
  const [newColorName, setNewColorName] = useState('');

  const updateSizes = (sizes: SizeVariant[]) => onChange({ ...value, sizes });
  const updateColors = (colors: ColorVariant[]) => onChange({ ...value, colors });

  const toggleSize = (size: string) => {
    const exists = value.sizes.find((s) => s.size === size);
    if (exists) {
      updateSizes(value.sizes.filter((s) => s.size !== size));
    } else {
      updateSizes([...value.sizes, { size, stock: 0 }]);
    }
  };

  const updateSizeStock = (size: string, stock: number) => {
    updateSizes(value.sizes.map((s) => (s.size === size ? { ...s, stock } : s)));
  };

  const addColor = () => {
    const name = newColorName.trim();
    if (!name) return;
    if (value.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    updateColors([...value.colors, { name, sku: '', priceOverride: '', stock: 0 }]);
    setNewColorName('');
  };

  const removeColor = (index: number) => {
    updateColors(value.colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, field: keyof ColorVariant, val: string | number) => {
    updateColors(value.colors.map((c, i) => (i === index ? { ...c, [field]: val } : c)));
  };

  const hasAnyVariants = value.sizes.length > 0 || value.otherSizeEnabled || value.colors.length > 0;
  const variantPreview = buildVariantPayloads(baseSku, basePrice, value);

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-md)' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>Variants (Optional)</h3>

      {/* Sizes */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem' }}>Sizes</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {PRESET_SIZES.map((size) => {
            const selected = value.sizes.some((s) => s.size === size);
            return (
              <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected} onChange={() => toggleSize(size)} />
                {size}
              </label>
            );
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value.otherSizeEnabled}
              onChange={(e) => onChange({ ...value, otherSizeEnabled: e.target.checked, otherSizeLabel: e.target.checked ? value.otherSizeLabel : '' })}
            />
            Other
          </label>
        </div>

        {value.otherSizeEnabled && (
          <div style={{ marginBottom: 8 }}>
            <input
              value={value.otherSizeLabel}
              onChange={(e) => onChange({ ...value, otherSizeLabel: e.target.value })}
              placeholder="Enter custom size (e.g. Free Size, S, 3XL)"
              style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }}
            />
          </div>
        )}

        {value.sizes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {value.sizes.map((sv) => (
              <div key={sv.size} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <span style={{ minWidth: 30, fontWeight: 600 }}>{sv.size}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={sv.stock}
                  onChange={(e) => updateSizeStock(sv.size, parseInt(e.target.value) || 0)}
                  style={{ width: 60, padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }}
                />
              </div>
            ))}
          </div>
        )}

        {value.otherSizeEnabled && value.otherSizeLabel && (
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600 }}>{value.otherSizeLabel}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>Qty:</span>
              <input
                type="number"
                min={0}
                value={value.sizes.find((s) => s.size === value.otherSizeLabel)?.stock ?? 0}
                onChange={(e) => {
                  const stock = parseInt(e.target.value) || 0;
                  const existing = value.sizes.find((s) => s.size === value.otherSizeLabel);
                  if (existing) {
                    updateSizes(value.sizes.map((s) => (s.size === value.otherSizeLabel ? { ...s, stock } : s)));
                  } else {
                    updateSizes([...value.sizes, { size: value.otherSizeLabel, stock }]);
                  }
                }}
                style={{ width: 60, padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Colors */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem' }}>Colors</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
            placeholder="Color name (e.g. Red, Black)"
            style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }}
          />
          <button type="button" onClick={addColor} disabled={!newColorName.trim()} style={{ padding: '6px 12px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.8rem', cursor: newColorName.trim() ? 'pointer' : 'not-allowed', opacity: newColorName.trim() ? 1 : 0.5 }}>
            + Add Color
          </button>
        </div>

        {value.colors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {value.colors.map((cv, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 80px 30px', gap: 6, alignItems: 'center', padding: '6px 8px', background: 'var(--color-surface)', borderRadius: 4, fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>{cv.name}</span>
                <input value={cv.sku} onChange={(e) => updateColor(i, 'sku', e.target.value)} placeholder="SKU (auto if empty)" style={{ padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }} />
                <input type="number" step="0.01" min={0} value={cv.priceOverride} onChange={(e) => updateColor(i, 'priceOverride', e.target.value)} placeholder={`৳${basePrice}`} style={{ padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }} />
                <input type="number" min={0} value={cv.stock} onChange={(e) => updateColor(i, 'stock', parseInt(e.target.value) || 0)} placeholder="Qty" style={{ padding: '4px 6px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.8rem' }} />
                <button type="button" onClick={() => removeColor(i)} style={{ width: 24, height: 24, background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {hasAnyVariants && (
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Variant Preview ({variantPreview.length} variants):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {variantPreview.map((v, i) => (
              <span key={i} style={{ padding: '2px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.7rem' }}>
                {v.sku}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
