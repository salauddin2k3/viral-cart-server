'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { useCart } from '../../lib/cart';

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string;
  regularPrice: number;
  finalPrice: number;
  discountPercent: number;
  discountEnabled: boolean;
  stock: number;
  stockStatus: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: { name: string; slug: string };
  images: Array<{ url: string; altText: string | null; sortOrder: number }>;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    regularPrice: number;
    finalPrice: number;
    discountPercent: number;
    discountEnabled: boolean;
    stock: number;
  }>;
  related: Array<{
    id: string;
    name: string;
    slug: string;
    regularPrice: number;
    finalPrice: number;
    discountPercent: number;
    discountEnabled: boolean;
    stockStatus: string;
    images: Array<{ url: string }>;
  }>;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const { addItem, setBuyNow } = useCart();

  const activeVariant = product?.variants.find((v) => v.id === selectedVariant) ?? null;
  const finalPrice = activeVariant
    ? activeVariant.discountEnabled
      ? Number(activeVariant.regularPrice) * (1 - activeVariant.discountPercent / 100)
      : Number(activeVariant.finalPrice)
    : product?.discountEnabled
      ? Number(product.regularPrice) * (1 - product.discountPercent / 100)
      : Number(product?.regularPrice ?? 0);

  const availableStock = activeVariant
    ? activeVariant.stock
    : product?.stock ?? 0;

  const stockStatus = activeVariant
    ? activeVariant.stock === 0 ? 'out_of_stock' : activeVariant.stock <= 5 ? 'low_stock' : 'in_stock'
    : product?.stockStatus ?? 'out_of_stock';

  const maxQty = Math.min(availableStock, 99);

  useEffect(() => {
    if (!slug) return;
    apiFetch<ProductDetail>(`/api/products/${slug}`)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (qty > maxQty && stockStatus !== 'out_of_stock') {
      setQty(Math.max(1, maxQty));
    }
  }, [maxQty, qty, stockStatus]);

  if (loading) return <div className="container" style={{ padding: 'var(--space-2xl)' }}><p>Loading...</p></div>;
  if (!product) return <div className="container" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}><h2>Product not found</h2><Link href="/all-products">Back to products</Link></div>;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: activeVariant ? `${product.name} - ${activeVariant.name}` : product.name,
      unitPrice: finalPrice,
      discountPercent: 0,
      image: product.images?.[0]?.url || null,
      stockSignal: stockStatus as 'in_stock' | 'low_stock' | 'out_of_stock',
      quantity: qty,
      variantId: activeVariant?.id,
    });
  };

  const handleBuyNow = () => {
    setBuyNow({
      productId: product.id,
      slug: product.slug,
      name: activeVariant ? `${product.name} - ${activeVariant.name}` : product.name,
      unitPrice: finalPrice,
      discountPercent: 0,
      image: product.images?.[0]?.url || null,
      stockSignal: stockStatus as 'in_stock' | 'low_stock' | 'out_of_stock',
      quantity: qty,
      variantId: activeVariant?.id,
    });
    router.push('/checkout');
  };

  return (
    <div className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: product.images?.[0]?.url,
            description: product.shortDescription || product.fullDescription || '',
            sku: product.sku || undefined,
            brand: { '@type': 'Brand', name: 'E-Commerce Store' },
            offers: {
              '@type': 'Offer',
              url: `/product/${product.slug}`,
              priceCurrency: 'BDT',
              price: finalPrice.toFixed(2),
              availability: product.stockStatus === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            },
          }),
        }}
      />
      <nav style={{ marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--color-text-muted)', overflowWrap: 'break-word' }}>
        <Link href="/" style={{ color: 'var(--color-accent)' }}>Home</Link>
        {' / '}
        <Link href={`/category/${product.category.slug}`} style={{ color: 'var(--color-accent)' }}>{product.category.name}</Link>
        {' / '}
        <span>{product.name}</span>
      </nav>

      <div className="product-detail-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ padding: '0 var(--space-sm)' }}>
          <div style={{ aspectRatio: '1', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-sm)' }}>
            {product.images[selectedImage] ? (
              <img src={product.images[selectedImage].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>No Image</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} style={{ width: 60, height: 60, border: i === selectedImage ? '2px solid var(--color-accent)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', padding: 0, background: '#fff' }}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '0 var(--space-sm)' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>{product.name}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Category: <Link href={`/category/${product.category.slug}`} style={{ color: 'var(--color-accent)' }}>{product.category.name}</Link>
          </p>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            {product.discountEnabled && (
              <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', marginRight: 8 }}>
                {formatTaka(product.regularPrice)}
              </span>
            )}
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: product.discountEnabled ? 'var(--color-accent)' : 'inherit' }}>
              {formatTaka(finalPrice)}
            </span>
            {product.discountEnabled && (
              <span style={{ marginLeft: 8, fontSize: '0.9rem', color: 'var(--color-accent)' }}>-{product.discountPercent}%</span>
            )}
          </div>

          {product.shortDescription && (
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)' }}>{product.shortDescription}</p>
          )}

          {product.variants.length > 0 && (() => {
            const SIZES = ['M', 'L', 'XL', 'XXL'];
            const sizeVariants = product.variants.filter((v) => SIZES.includes(v.name));
            const colorVariants = product.variants.filter((v) => !v.name.includes('/') && !SIZES.includes(v.name));
            const comboVariants = product.variants.filter((v) => v.name.includes('/'));

            const selectedSize = selectedVariant
              ? product.variants.find((v) => v.id === selectedVariant)?.name.split('/')[0]?.trim()
              : null;
            const selectedColor = selectedVariant
              ? product.variants.find((v) => v.id === selectedVariant)?.name.split('/')[1]?.trim()
              : null;

            const hasSizes = sizeVariants.length > 0 || comboVariants.length > 0;
            const hasColors = colorVariants.length > 0 || comboVariants.length > 0;
            const hasCombos = comboVariants.length > 0;

            const uniqueSizes = hasCombos
              ? [...new Set(comboVariants.map((v) => v.name.split('/')[0].trim()))]
              : sizeVariants.map((v) => v.name);

            const uniqueColors = hasCombos
              ? [...new Set(comboVariants.map((v) => v.name.split('/')[1].trim()))]
              : colorVariants.map((v) => v.name);

            const findVariant = (size: string | null, color: string | null) => {
              if (size && color) {
                return comboVariants.find((v) => {
                  const [s, c] = v.name.split('/').map((x) => x.trim());
                  return s === size && c === color;
                });
              }
              if (size) return sizeVariants.find((v) => v.name === size);
              if (color) return colorVariants.find((v) => v.name === color);
              return null;
            };

            return (
              <>
                {hasSizes && uniqueSizes.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>Size:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {uniqueSizes.map((size) => {
                        const v = findVariant(size, null);
                        const comboV = hasCombos ? comboVariants.filter((cv) => cv.name.split('/')[0].trim() === size) : [];
                        const outOfStock = hasCombos ? comboV.every((cv) => cv.stock === 0) : (v?.stock ?? 0) === 0;
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedVariant(null);
                              } else if (hasCombos && uniqueColors.length > 0) {
                                const firstAvailable = comboV.find((cv) => cv.stock > 0);
                                setSelectedVariant(firstAvailable?.id ?? null);
                              } else {
                                setSelectedVariant(v?.id ?? null);
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              background: isSelected ? 'rgba(0,123,255,0.05)' : '#fff',
                              cursor: outOfStock ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              opacity: outOfStock ? 0.5 : 1,
                            }}
                            disabled={outOfStock}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasColors && uniqueColors.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>Color:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {uniqueColors.map((color) => {
                        const v = findVariant(null, color);
                        const comboV = hasCombos ? comboVariants.filter((cv) => cv.name.split('/')[1].trim() === color) : [];
                        const outOfStock = hasCombos ? comboV.every((cv) => cv.stock === 0) : (v?.stock ?? 0) === 0;
                        const isSelected = selectedColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedVariant(null);
                              } else if (hasCombos && uniqueSizes.length > 0) {
                                const firstAvailable = comboV.find((cv) => cv.stock > 0);
                                setSelectedVariant(firstAvailable?.id ?? null);
                              } else {
                                setSelectedVariant(v?.id ?? null);
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              background: isSelected ? 'rgba(0,123,255,0.05)' : '#fff',
                              cursor: outOfStock ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              opacity: outOfStock ? 0.5 : 1,
                            }}
                            disabled={outOfStock}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedVariant && (
                  <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Selected: <strong>{product.variants.find((v) => v.id === selectedVariant)?.name}</strong>
                    {activeVariant && activeVariant.stock > 0 && (
                      <span> — {activeVariant.stock} in stock</span>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <span style={{ color: stockStatus === 'out_of_stock' ? 'var(--color-danger)' : stockStatus === 'low_stock' ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {stockStatus === 'out_of_stock' ? 'Out of Stock' : stockStatus === 'low_stock' ? 'Low Stock' : 'In Stock'}
            </span>
          </div>

          {stockStatus !== 'out_of_stock' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} style={{ padding: '8px 12px', border: 'none', background: 'none', cursor: qty <= 1 ? 'not-allowed' : 'pointer', opacity: qty <= 1 ? 0.4 : 1 }}>-</button>
                <span style={{ padding: '8px 16px', minWidth: 40, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} style={{ padding: '8px 12px', border: 'none', background: 'none', cursor: qty >= maxQty ? 'not-allowed' : 'pointer', opacity: qty >= maxQty ? 0.4 : 1 }}>+</button>
              </div>
              {maxQty < 99 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Max: {maxQty}</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button
              onClick={handleAddToCart}
              disabled={stockStatus === 'out_of_stock'}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid var(--color-accent)',
                background: '#fff',
                color: 'var(--color-accent)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                opacity: stockStatus === 'out_of_stock' ? 0.5 : 1,
              }}
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={stockStatus === 'out_of_stock'}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                opacity: stockStatus === 'out_of_stock' ? 0.5 : 1,
              }}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {product.fullDescription && (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>Description</h2>
          <div style={{ lineHeight: 1.8, overflowWrap: 'break-word', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: product.fullDescription }} />
        </div>
      )}

      {product.related.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>Related Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
            {product.related.map((rel) => {
              const relFinal = rel.discountEnabled ? Number(rel.regularPrice) * (1 - rel.discountPercent / 100) : Number(rel.regularPrice);
              return (
                <Link key={rel.id} href={`/product/${rel.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ aspectRatio: '1', background: 'var(--color-surface)' }}>
                      {rel.images[0] && <img src={rel.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ padding: 'var(--space-sm)' }}>
                      <h3 style={{ fontSize: '0.85rem', marginBottom: 4 }}>{rel.name}</h3>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatTaka(relFinal)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
