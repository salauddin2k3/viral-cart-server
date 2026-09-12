'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '../lib/cart';
import { apiFetch } from '../lib/api';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  subcategories: SubCategory[];
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const megaRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { itemCount } = useCart();

  useEffect(() => {
    apiFetch<{ items: Category[] }>('/api/categories?limit=50')
      .then((res) => setCategories(res.items))
      .catch(() => {});
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleMegaEnter = useCallback(() => {
    clearHoverTimeout();
    setMegaOpen(true);
  }, [clearHoverTimeout]);

  const handleMegaLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setMegaOpen(false);
      setActiveCategory(null);
    }, 150);
  }, []);

  useEffect(() => {
    return () => clearHoverTimeout();
  }, [clearHoverTimeout]);

  const activeCat = categories.find((c) => c.id === activeCategory);
  const allSubs = activeCat?.subcategories ?? [];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--color-primary)',
      color: '#fff',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
      }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>
          Store
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/" style={{ color: '#fff', fontSize: '0.9rem' }}>Home</Link>

          <div
            ref={megaRef}
            onMouseEnter={handleMegaEnter}
            onMouseLeave={handleMegaLeave}
            style={{ position: 'relative' }}
          >
            <Link
              href="/all-products"
              style={{
                color: '#fff',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
              }}
            >
              All Products
              <span style={{ fontSize: '0.7rem' }}>{megaOpen ? '▲' : '▼'}</span>
            </Link>

            {megaOpen && categories.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#fff',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  marginTop: 8,
                  zIndex: 200,
                  display: 'flex',
                  minWidth: 560,
                  overflow: 'hidden',
                }}
                onMouseEnter={handleMegaEnter}
                onMouseLeave={handleMegaLeave}
              >
                {/* Category list */}
                <div style={{
                  width: 200,
                  borderRight: '1px solid var(--color-border)',
                  padding: 'var(--space-sm) 0',
                  flexShrink: 0,
                }}>
                  <Link
                    href="/all-products"
                    onClick={() => setMegaOpen(false)}
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      color: 'var(--color-text)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--color-border)',
                      textDecoration: 'none',
                    }}
                  >
                    View All Products
                  </Link>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onMouseEnter={() => setActiveCategory(cat.id)}
                      style={{
                        display: 'block',
                        padding: '8px 16px',
                        color: activeCategory === cat.id ? 'var(--color-accent)' : 'var(--color-text)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        background: activeCategory === cat.id ? 'rgba(var(--color-accent-rgb, 0,123,255), 0.05)' : 'transparent',
                        fontWeight: activeCategory === cat.id ? 600 : 400,
                      }}
                    >
                      {cat.name}
                      {cat.subcategories.length > 0 && <span style={{ float: 'right', fontSize: '0.7rem' }}>▸</span>}
                    </div>
                  ))}
                </div>

                {/* Subcategory panel */}
                <div style={{ flex: 1, padding: 'var(--space-md)', minWidth: 320 }}>
                  {activeCat ? (
                    allSubs.length > 0 ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-sm)', color: 'var(--color-text)' }}>
                          {activeCat.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-sm)' }}>
                          {allSubs.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/all-products?category=${sub.slug}`}
                              onClick={() => setMegaOpen(false)}
                              style={{
                                display: 'block',
                                padding: '8px 12px',
                                color: 'var(--color-text)',
                                fontSize: '0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                textDecoration: 'none',
                                transition: 'border-color 0.15s',
                              }}
                              onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--color-accent)'; }}
                              onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                        <Link
                          href={`/all-products?category=${activeCat.slug}`}
                          onClick={() => setMegaOpen(false)}
                          style={{
                            display: 'inline-block',
                            marginTop: 'var(--space-sm)',
                            fontSize: '0.85rem',
                            color: 'var(--color-accent)',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View All {activeCat.name} →
                        </Link>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-sm)', color: 'var(--color-text)' }}>
                          {activeCat.name}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No subcategories</p>
                        <Link
                          href={`/all-products?category=${activeCat.slug}`}
                          onClick={() => setMegaOpen(false)}
                          style={{
                            display: 'inline-block',
                            marginTop: 'var(--space-sm)',
                            fontSize: '0.85rem',
                            color: 'var(--color-accent)',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View All {activeCat.name} →
                        </Link>
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      Hover over a category to see subcategories
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/track" style={{ color: '#fff', fontSize: '0.9rem' }}>Track Order</Link>
          <Link href="/cart" className="header-cart-link" style={{ color: '#fff', position: 'relative', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {itemCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -8,
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}>
                {itemCount}
              </span>
            )}
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.5rem',
          }}
          className="mobile-menu-btn"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px 0',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Link href="/" style={{ color: '#fff' }} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/all-products" style={{ color: '#fff' }} onClick={() => setMenuOpen(false)}>All Products</Link>
          {categories.slice(0, 8).map((cat) => (
            <div key={cat.id}>
              <Link href={`/all-products?category=${cat.slug}`} style={{ color: '#fff', fontWeight: 600 }} onClick={() => setMenuOpen(false)}>
                {cat.name}
              </Link>
              {cat.subcategories.slice(0, 4).map((sub) => (
                <Link key={sub.id} href={`/all-products?category=${sub.slug}`} style={{ color: '#fff', paddingLeft: 16, fontSize: '0.85rem' }} onClick={() => setMenuOpen(false)}>
                  {sub.name}
                </Link>
              ))}
            </div>
          ))}
          <Link href="/track" style={{ color: '#fff' }} onClick={() => setMenuOpen(false)}>Track Order</Link>
          <Link href="/cart" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setMenuOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Cart ({itemCount})
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          nav { display: none !important; }
        }
      `}</style>
    </header>
  );
}
