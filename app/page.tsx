'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from './lib/api';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  ctaEnabled: boolean;
  ctaText: string;
  ctaUrl: string;
}

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

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (idx === current || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setTimeout(() => setAnimating(false), 50);
    }, 300);
  }, [current, animating]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [slides.length, next, paused]);

  if (slides.length === 0) {
    return (
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        color: '#fff',
        padding: 'var(--space-2xl) 0',
        textAlign: 'center',
      }}>
        <div className="container">
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 'var(--space-md)' }}>
            Welcome to Our Store
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: 'var(--space-lg)' }}>
            Discover amazing products at great prices
          </p>
          <Link href="/all-products" style={{
            display: 'inline-block',
            background: 'var(--color-accent)',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '1rem',
          }}>
            Shop Now
          </Link>
        </div>
      </section>
    );
  }

  const slide = slides[current];

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slides" style={{ position: 'relative', height: 'clamp(280px, 42vw, 480px)', overflow: 'hidden' }}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="hero-slide"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === current ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
              zIndex: i === current ? 1 : 0,
              pointerEvents: i === current ? 'auto' : 'none',
            }}
          >
            {s.imageUrl ? (
              <div style={{ position: 'absolute', inset: 0 }}>
                <img
                  src={s.imageUrl}
                  alt={s.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: i === current ? 'scale(1)' : 'scale(1.05)',
                    transition: 'transform 6s ease-out',
                  }}
                />
              </div>
            ) : (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }} />
            )}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)',
            }} />
            <div className="hero-content" style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 clamp(24px, 8%, 120px)',
              zIndex: 2,
            }}>
              <div style={{ color: '#fff', maxWidth: 560 }}>
                <h1 className="hero-title" style={{
                  fontSize: 'clamp(1.6rem, 4.5vw, 3rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  marginBottom: 'var(--space-sm)',
                  letterSpacing: '-0.02em',
                  opacity: i === current ? 1 : 0,
                  transform: i === current ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
                }}>
                  {s.title}
                </h1>
                {s.subtitle && (
                  <p className="hero-subtitle" style={{
                    fontSize: 'clamp(0.95rem, 1.8vw, 1.2rem)',
                    opacity: i === current ? 0.9 : 0,
                    transform: i === current ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
                    marginBottom: 'var(--space-lg)',
                    lineHeight: 1.5,
                  }}>
                    {s.subtitle}
                  </p>
                )}
                {s.ctaEnabled && s.ctaUrl && (
                  <a
                    href={s.ctaUrl}
                    className="hero-cta"
                    style={{
                      display: 'inline-block',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      padding: '14px 36px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontSize: 'clamp(0.9rem, 1.4vw, 1.05rem)',
                      textDecoration: 'none',
                      letterSpacing: '0.02em',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                      opacity: i === current ? 1 : 0,
                      transform: i === current ? 'translateY(0)' : 'translateY(20px)',
                      transition: 'opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s, background 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {s.ctaText || 'Shop Now'}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="hero-arrow hero-arrow-left"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="hero-arrow hero-arrow-right"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <div className="hero-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`hero-dot ${i === current ? 'hero-dot-active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .hero-carousel { position: relative; overflow: hidden; }
        .hero-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
          width: 44px; height: 44px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, transform 0.2s;
          opacity: 0;
        }
        .hero-carousel:hover .hero-arrow { opacity: 1; }
        .hero-arrow:hover { background: rgba(255,255,255,0.3); transform: translateY(-50%) scale(1.08); }
        .hero-arrow-left { left: 16px; }
        .hero-arrow-right { right: 16px; }
        .hero-dots {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          display: flex; gap: 8px; z-index: 10;
        }
        .hero-dot {
          width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.7);
          background: transparent; cursor: pointer; padding: 0;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
        }
        .hero-dot:hover { border-color: #fff; transform: scale(1.2); }
        .hero-dot-active { background: #fff; border-color: #fff; transform: scale(1.15); }
        .hero-cta:hover { background: color-mix(in srgb, var(--color-accent) 85%, #000) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.35) !important; }
        @media (max-width: 640px) {
          .hero-arrow { width: 36px; height: 36px; opacity: 1; }
          .hero-arrow-left { left: 8px; }
          .hero-arrow-right { right: 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-slide { transition: opacity 0.1s !important; }
          .hero-slide img { transition: none !important; }
          .hero-title, .hero-subtitle, .hero-cta { transition: opacity 0.1s !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  const finalPrice = product.discountEnabled
    ? Number(product.regularPrice) * (1 - product.discountPercent / 100)
    : Number(product.regularPrice);

  return (
    <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="product-card" style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
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
            <img src={image.url} alt={image.altText || product.name} className="product-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>No Image</span>
          )}
        </div>
        <div style={{ padding: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 4, lineHeight: 1.3 }}>{product.name}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{product.category.name}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {product.discountEnabled && (
              <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {formatTaka(product.regularPrice)}
              </span>
            )}
            <span style={{ fontWeight: 700, color: product.discountEnabled ? 'var(--color-accent)' : 'inherit' }}>
              {formatTaka(finalPrice)}
            </span>
            {product.discountEnabled && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>-{product.discountPercent}%</span>
            )}
          </div>
          {product.stockStatus === 'out_of_stock' && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>Out of Stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/category/${category.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="category-card" style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        textAlign: 'center',
        padding: 'var(--space-lg)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--color-surface)',
          margin: '0 auto var(--space-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'transform 0.2s',
        }}>
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem' }}>📦</span>
          )}
        </div>
        <h3 style={{ fontSize: '0.95rem' }}>{category.name}</h3>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ items: HeroSlide[] }>('/api/hero').catch(() => ({ items: [] })),
      apiFetch<{ items: Product[] }>('/api/products?limit=8&sort=newest').catch(() => ({ items: [] })),
      apiFetch<{ items: Product[] }>('/api/products?limit=8&sort=popular').catch(() => ({ items: [] })),
      apiFetch<{ items: Category[] }>('/api/categories?limit=20').catch(() => ({ items: [] })),
    ]).then(([heroRes, prodRes, featuredRes, catRes]) => {
      setSlides(heroRes.items);
      setProducts(prodRes.items);
      setFeaturedProducts(featuredRes.items);
      setCategories(catRes.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container page-content" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <HeroCarousel slides={slides} />

      {categories.length > 0 && (
        <section className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-lg)' }}>Categories</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 'var(--space-md)',
          }}>
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-lg)' }}>Featured Products</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--space-md)',
          }}>
            {featuredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="container page-content" style={{ padding: 'var(--space-2xl) 0' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-lg)' }}>Latest Products</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--space-md)',
          }}>
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}
      <style>{`
        .product-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .product-card:hover .product-card-img {
          transform: scale(1.05);
        }
        .category-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .category-card:hover > div:first-child {
          transform: scale(1.08);
        }
        @media (prefers-reduced-motion: reduce) {
          .product-card, .category-card, .product-card-img { transition: none !important; transform: none !important; }
        }
      `}</style>
    </div>
  );
}
