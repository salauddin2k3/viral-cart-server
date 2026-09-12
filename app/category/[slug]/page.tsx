'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { useCart } from '../../lib/cart';

interface Product {
  id: string;
  name: string;
  slug: string;
  regularPrice: number;
  finalPrice: number;
  discountPercent: number;
  discountEnabled: boolean;
  stockStatus: string;
  images: Array<{ url: string; altText: string | null }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      apiFetch<Category>(`/api/categories/${slug}`),
      apiFetch<{ items: Product[] }>(`/api/products?category=${slug}&limit=50`),
    ])
      .then(([cat, prod]) => {
        setCategory(cat);
        setProducts(prod.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container" style={{ padding: 'var(--space-2xl)' }}><p>Loading...</p></div>;
  if (!category) return <div className="container" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}><h2>Category not found</h2></div>;

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
      <nav style={{ marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <Link href="/" style={{ color: 'var(--color-accent)' }}>Home</Link>
        {' / '}
        <span>{category.name}</span>
      </nav>

      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>{category.name}</h1>

      {products.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No products in this category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
          {products.map((prod) => {
            const image = prod.images?.[0];
            const finalPrice = prod.discountEnabled ? Number(prod.regularPrice) * (1 - prod.discountPercent / 100) : Number(prod.regularPrice);
            return (
              <Link key={prod.id} href={`/product/${prod.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {image ? <img src={image.url} alt={image.altText || prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>No Image</span>}
                  </div>
                  <div style={{ padding: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: 4 }}>{prod.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {prod.discountEnabled && <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{formatTaka(prod.regularPrice)}</span>}
                      <span style={{ fontWeight: 700, color: prod.discountEnabled ? 'var(--color-accent)' : 'inherit' }}>{formatTaka(finalPrice)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
