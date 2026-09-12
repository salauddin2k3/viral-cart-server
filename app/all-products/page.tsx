'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { useCart } from '../lib/cart';

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
  category: { name: string; slug: string };
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function AllProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { addItem } = useCart();

  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';

  const fetchProducts = async (cursor?: string, append = false) => {
    const params = new URLSearchParams({ sort, limit: '20' });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (cursor) params.set('cursor', cursor);

    try {
      const res = await apiFetch<{ items: Product[]; nextCursor: string | null }>(
        `/api/products?${params.toString()}`,
      );
      if (append) {
        setProducts((prev) => [...prev, ...res.items]);
      } else {
        setProducts(res.items);
      }
      setNextCursor(res.nextCursor);
    } catch {
      // fail silently
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProducts().finally(() => setLoading(false));
  }, [sort, search, category]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await fetchProducts(nextCursor, true);
    setLoadingMore(false);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    const finalPrice = product.discountEnabled
      ? Number(product.regularPrice) * (1 - product.discountPercent / 100)
      : Number(product.regularPrice);
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: finalPrice,
      discountPercent: 0,
      image: product.images?.[0]?.url || null,
      stockSignal: product.stockStatus as 'in_stock' | 'low_stock' | 'out_of_stock',
    });
  };

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>
        {search ? `Search: "${search}"` : category ? `Category: ${category}` : 'All Products'}
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {['newest', 'price_asc', 'price_desc', 'popular'].map((s) => (
          <Link
            key={s}
            href={`/all-products?sort=${s}${search ? `&q=${search}` : ''}${category ? `&category=${category}` : ''}`}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: sort === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
              background: sort === s ? 'var(--color-accent)' : 'transparent',
              color: sort === s ? '#fff' : 'inherit',
              fontSize: '0.85rem',
            }}
          >
            {s === 'newest' ? 'Newest' : s === 'price_asc' ? 'Price: Low to High' : s === 'price_desc' ? 'Price: High to Low' : 'Popular'}
          </Link>
        ))}
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>No products found.</p>
          <Link href="/all-products" style={{ color: 'var(--color-accent)' }}>View all products</Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--space-md)',
          }}>
            {products.map((prod) => {
              const image = prod.images?.[0];
              const finalPrice = prod.discountEnabled
                ? Number(prod.regularPrice) * (1 - prod.discountPercent / 100)
                : Number(prod.regularPrice);

              return (
                <Link key={prod.id} href={`/product/${prod.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.2s',
                  }}>
                    <div style={{
                      aspectRatio: '1',
                      background: 'var(--color-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {image ? (
                        <img src={image.url} alt={image.altText || prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>No Image</span>
                      )}
                    </div>
                    <div style={{ padding: 'var(--space-md)' }}>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: 4, lineHeight: 1.3 }}>{prod.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{prod.category.name}</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        {prod.discountEnabled && (
                          <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            {formatTaka(prod.regularPrice)}
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: prod.discountEnabled ? 'var(--color-accent)' : 'inherit' }}>
                          {formatTaka(finalPrice)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleAddToCart(e, prod)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: prod.stockStatus === 'out_of_stock' ? 'var(--color-text-muted)' : 'var(--color-accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                        disabled={prod.stockStatus === 'out_of_stock'}
                      >
                        {prod.stockStatus === 'out_of_stock' ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {nextCursor && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 32px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  fontSize: '0.9rem',
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AllProductsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 'var(--space-2xl)' }}><p>Loading...</p></div>}>
      <AllProductsContent />
    </Suspense>
  );
}
