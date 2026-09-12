'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cart';

interface LandingProduct {
  id: string;
  name: string;
  slug: string;
  regularPrice: number;
  finalPrice: number;
  discountEnabled: boolean;
  discountPercent: number;
  stock: number;
  trackInventory: boolean;
  images: Array<{ url: string; altText: string | null }>;
  category: { name: string; slug: string };
  variants: Array<{
    id: string; name: string; sku: string;
    regularPrice: number; finalPrice: number;
    discountEnabled: boolean; discountPercent: number; stock: number;
  }>;
}

interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  template: string;
  content: Record<string, unknown>;
  heroImageUrl: string | null;
  metaDescription: string | null;
  product: LandingProduct | null;
}

interface ContentSection {
  id: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  data: Record<string, unknown>;
}

function formatTaka(amount: number): string {
  return `\u09F3${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function getSections(content: Record<string, unknown>): ContentSection[] {
  const raw = content?.sections;
  if (Array.isArray(raw)) return raw as ContentSection[];
  return [];
}

/* ─── Scroll animation hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('lp-visible'); obs.unobserve(el); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealDiv({ children, className = '', style = {}, delay = 0 }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`lp-reveal ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ─── ProductOrdering widget ─── */
function ProductOrdering({ product, ctaText = 'Order Now', variant: styleVariant = 'default' }: { product: LandingProduct; ctaText?: string; variant?: 'default' | 'dark' | 'light' | 'accent' }) {
  const router = useRouter();
  const { setBuyNow } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const activeVariant = product.variants.find((v) => v.id === selectedVariantId);
  const isVariant = !!activeVariant;
  const price = isVariant
    ? activeVariant!.discountEnabled ? Number(activeVariant!.regularPrice) * (1 - activeVariant!.discountPercent / 100) : Number(activeVariant!.finalPrice)
    : product.discountEnabled ? Number(product.regularPrice) * (1 - product.discountPercent / 100) : Number(product.finalPrice);
  const regularPrice = isVariant ? Number(activeVariant!.regularPrice) : Number(product.regularPrice);
  const discountEnabled = isVariant ? activeVariant!.discountEnabled : product.discountEnabled;
  const stock = isVariant ? activeVariant!.stock : product.stock;
  const outOfStock = product.trackInventory && stock === 0;
  const stockSignal: 'in_stock' | 'low_stock' | 'out_of_stock' = stock === 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock';

  const buildItem = (quantity: number) => ({
    productId: product.id, slug: product.slug,
    name: isVariant ? `${product.name} - ${activeVariant!.name}` : product.name,
    unitPrice: price, discountPercent: 0, image: product.images?.[0]?.url || null,
    stockSignal, quantity, variantId: activeVariant?.id,
  });

  const handleOrderNow = () => { setBuyNow(buildItem(qty)); router.push('/checkout'); };

  const colors = {
    default: { btnBg: 'var(--color-accent)', btnHover: '#0056b3' },
    dark: { btnBg: '#1a1a2e', btnHover: '#16213e' },
    light: { btnBg: '#fff', btnHover: '#f0f0f0' },
    accent: { btnBg: 'var(--color-accent)', btnHover: '#0056b3' },
  }[styleVariant];

  return (
    <div>
      {product.variants.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.9rem' }}>Select Option:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((v) => {
              const vDisabled = product.trackInventory && v.stock === 0;
              return (
                <button key={v.id} onClick={() => setSelectedVariantId(v.id === selectedVariantId ? null : v.id)} disabled={vDisabled}
                  style={{ padding: '10px 18px', border: v.id === selectedVariantId ? '2px solid var(--color-accent)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: v.id === selectedVariantId ? 'rgba(0,123,255,0.05)' : '#fff', cursor: vDisabled ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: vDisabled ? 0.5 : 1 }}>
                  <div style={{ fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {formatTaka(v.discountEnabled ? Number(v.regularPrice) * (1 - v.discountPercent / 100) : Number(v.finalPrice))}
                    {vDisabled && ' (Out of Stock)'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        {discountEnabled && <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '1rem' }}>{formatTaka(regularPrice)}</span>}
        <span style={{ fontWeight: 700, fontSize: '1.5rem', color: discountEnabled ? 'var(--color-accent)' : 'inherit' }}>{formatTaka(price)}</span>
        {discountEnabled && <span style={{ background: 'var(--color-danger)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>-{product.discountPercent}%</span>}
      </div>
      <div style={{ marginBottom: 16, fontSize: '0.85rem', color: outOfStock ? 'var(--color-danger)' : stockSignal === 'low_stock' ? '#d4a017' : 'var(--color-success)' }}>
        {outOfStock ? 'Out of Stock' : stockSignal === 'low_stock' ? `Only ${stock} left - Order soon!` : 'In Stock - Ready to ship'}
      </div>
      {!outOfStock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>-</button>
            <span style={{ padding: '8px 16px', minWidth: 40, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
            <button onClick={() => setQty(Math.min(10, qty + 1))} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
          </div>
        </div>
      )}
      <button onClick={handleOrderNow} disabled={outOfStock}
        className="lp-order-btn"
        style={{ width: '100%', padding: '16px 24px', border: 'none', borderRadius: 'var(--radius-md)', background: outOfStock ? 'var(--color-text-muted)' : colors.btnBg, color: styleVariant === 'light' ? '#1a1a2e' : '#fff', fontWeight: 700, fontSize: '1.1rem', cursor: outOfStock ? 'not-allowed' : 'pointer', letterSpacing: '0.5px', transition: 'transform 0.15s, box-shadow 0.15s' }}>
        {outOfStock ? 'Out of Stock' : ctaText}
      </button>
    </div>
  );
}

/* ─── Shared floating CTA bar ─── */
function FloatingCtaBar({ product, ctaText }: { product: LandingProduct; ctaText?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="lp-floating-bar">
      <div className="lp-floating-bar-inner">
        <span className="lp-floating-bar-name">{product.name}</span>
        <ProductOrdering product={product} ctaText={ctaText || 'Order Now'} variant="accent" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TEMPLATE A: Premium / Luxury
   Dark gradients, gold accents, glassmorphism, elegance
   ═══════════════════════════════════════════════════ */
function TemplateA({ page }: { page: LandingPageData }) {
  const product = page.product;
  const sections = getSections(page.content);
  const heroSection = sections.find((s) => s.type === 'hero' && s.enabled);
  const otherSections = sections.filter((s) => s.type !== 'hero' && s.type !== 'cta' && s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const ctaSection = sections.find((s) => s.type === 'cta' && s.enabled);
  const heroHeading = (heroSection?.data?.heading as string) || page.title;
  const heroSubheading = (heroSection?.data?.subheading as string) || page.subtitle || '';
  const heroText = (heroSection?.data?.text as string) || '';

  return (
    <div className="lp-template-a">
      {/* Hero */}
      <section className="lp-a-hero">
        {page.heroImageUrl && <img src={page.heroImageUrl} alt="" className="lp-a-hero-bg" />}
        <div className="lp-a-hero-overlay" />
        <div className="lp-a-hero-content">
          <RevealDiv><span className="lp-a-badge">Premium Quality</span></RevealDiv>
          <RevealDiv delay={100}><h1 className="lp-a-hero-title">{heroHeading}</h1></RevealDiv>
          {heroSubheading && <RevealDiv delay={200}><p className="lp-a-hero-sub">{heroSubheading}</p></RevealDiv>}
          {heroText && <RevealDiv delay={300}><p className="lp-a-hero-text">{heroText}</p></RevealDiv>}
          {product && <RevealDiv delay={400}><div className="lp-a-hero-order"><ProductOrdering product={product} /></div></RevealDiv>}
        </div>
      </section>

      {/* Product Showcase */}
      {product && (
        <section className="lp-a-showcase">
          <div className="lp-a-container">
            <RevealDiv>
              <div className="lp-a-showcase-grid">
                <div className="lp-a-showcase-img-wrap">
                  {product.images?.[0] ? <img src={product.images[0].url} alt={product.name} className="lp-a-showcase-img" /> : <div className="lp-a-showcase-img lp-a-showcase-img-empty">No Image</div>}
                </div>
                <div className="lp-a-showcase-info">
                  <span className="lp-a-category">{product.category.name}</span>
                  <h2 className="lp-a-showcase-title">{product.name}</h2>
                  <p className="lp-a-showcase-desc">Crafted with precision for those who appreciate the finer things. Every detail has been thoughtfully designed to deliver an unparalleled experience.</p>
                  <ProductOrdering product={product} />
                </div>
              </div>
            </RevealDiv>
          </div>
        </section>
      )}

      {/* Dynamic sections */}
      {otherSections.map((sec) => {
        switch (sec.type) {
          case 'benefits': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Why Choose Us';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-a-benefits">
                <div className="lp-a-container">
                  <RevealDiv><h2 className="lp-a-section-title">{title}</h2></RevealDiv>
                  <div className="lp-a-benefits-grid">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 80} className="lp-a-benefit-card">
                        <div className="lp-a-benefit-icon">&#10022;</div>
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'features': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Key Features';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-a-features">
                <div className="lp-a-container">
                  <RevealDiv><h2 className="lp-a-section-title lp-a-section-title--light">{title}</h2></RevealDiv>
                  <div className="lp-a-features-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-a-feature-item">
                        <span className="lp-a-feature-num">{String(j + 1).padStart(2, '0')}</span>
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'testimonials': {
            const items = (sec.data.items as Array<{ name: string; text: string; rating: number }>) || [];
            const title = (sec.data.title as string) || 'Client Testimonials';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-a-testimonials">
                <div className="lp-a-container">
                  <RevealDiv><h2 className="lp-a-section-title">{title}</h2></RevealDiv>
                  <div className="lp-a-testimonials-grid">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 100} className="lp-a-testimonial-card">
                        <div className="lp-a-testimonial-stars">{'★'.repeat(item.rating || 5)}</div>
                        <p className="lp-a-testimonial-text">&ldquo;{item.text}&rdquo;</p>
                        <p className="lp-a-testimonial-name">— {item.name}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'gallery': {
            if (!product) return null;
            const extraUrls = (sec.data.urls as string[]) || [];
            const allImages = [...product.images.map((img) => img.url), ...extraUrls].slice(0, 8);
            if (allImages.length === 0) return null;
            return (
              <section key={sec.id} className="lp-a-gallery">
                <div className="lp-a-container">
                  <RevealDiv><h2 className="lp-a-section-title">Product Gallery</h2></RevealDiv>
                  <div className="lp-a-gallery-grid">
                    {allImages.map((url, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-a-gallery-item">
                        <img src={url} alt={`${product.name} ${j + 1}`} loading="lazy" />
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'faq': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'FAQ';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-a-faq">
                <div className="lp-a-container">
                  <RevealDiv><h2 className="lp-a-section-title">{title}</h2></RevealDiv>
                  <div className="lp-a-faq-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 50} className="lp-a-faq-item">{item}</RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          default: return null;
        }
      })}

      {/* CTA */}
      {product && (
        <section className="lp-a-cta">
          <div className="lp-a-container">
            <RevealDiv>
              <h2 className="lp-a-cta-title">{(ctaSection?.data?.heading as string) || 'Experience Excellence'}</h2>
              <p className="lp-a-cta-text">{(ctaSection?.data?.text as string) || 'Order now and discover why thousands choose us.'}</p>
              <div className="lp-a-cta-order"><ProductOrdering product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} /></div>
            </RevealDiv>
          </div>
        </section>
      )}

      {product && <FloatingCtaBar product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TEMPLATE B: Modern / Bold
   Split hero, bold typography, stats bar, dynamic
   ═══════════════════════════════════════════════════ */
function TemplateB({ page }: { page: LandingPageData }) {
  const product = page.product;
  const sections = getSections(page.content);
  const heroSection = sections.find((s) => s.type === 'hero' && s.enabled);
  const otherSections = sections.filter((s) => s.type !== 'hero' && s.type !== 'cta' && s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const ctaSection = sections.find((s) => s.type === 'cta' && s.enabled);
  const heroHeading = (heroSection?.data?.heading as string) || page.title;
  const heroSubheading = (heroSection?.data?.subheading as string) || '';
  const heroText = (heroSection?.data?.text as string) || '';

  return (
    <div className="lp-template-b">
      {/* Split Hero */}
      <section className="lp-b-hero">
        <div className="lp-b-hero-left">
          <RevealDiv><span className="lp-b-eyebrow">New Arrival</span></RevealDiv>
          <RevealDiv delay={80}><h1 className="lp-b-hero-title">{heroHeading}</h1></RevealDiv>
          {heroSubheading && <RevealDiv delay={160}><p className="lp-b-hero-sub">{heroSubheading}</p></RevealDiv>}
          {heroText && <RevealDiv delay={240}><p className="lp-b-hero-text">{heroText}</p></RevealDiv>}
          {product && <RevealDiv delay={320}><div className="lp-b-hero-order"><ProductOrdering product={product} /></div></RevealDiv>}
        </div>
        <div className="lp-b-hero-right">
          {product?.images?.[0] ? <img src={product.images[0].url} alt={product.name} className="lp-b-hero-img" />
            : page.heroImageUrl ? <img src={page.heroImageUrl} alt="" className="lp-b-hero-img" />
            : <div className="lp-b-hero-img lp-b-hero-img-empty" />}
        </div>
      </section>

      {/* Stats bar */}
      {product && (
        <section className="lp-b-stats">
          <div className="lp-b-container">
            <RevealDiv>
              <div className="lp-b-stats-grid">
                <div className="lp-b-stat"><span className="lp-b-stat-num">{product.stock > 100 ? '1000+' : product.stock > 0 ? `${product.stock}+` : '0'}</span><span className="lp-b-stat-label">Units Sold</span></div>
                <div className="lp-b-stat"><span className="lp-b-stat-num">4.8&#9733;</span><span className="lp-b-stat-label">Rating</span></div>
                <div className="lp-b-stat"><span className="lp-b-stat-num">24h</span><span className="lp-b-stat-label">Fast Delivery</span></div>
                <div className="lp-b-stat"><span className="lp-b-stat-num">100%</span><span className="lp-b-stat-label">Satisfaction</span></div>
              </div>
            </RevealDiv>
          </div>
        </section>
      )}

      {/* Dynamic sections */}
      {otherSections.map((sec) => {
        switch (sec.type) {
          case 'benefits': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Benefits';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-b-benefits">
                <div className="lp-b-container">
                  <RevealDiv><h2 className="lp-b-section-title">{title}</h2></RevealDiv>
                  <div className="lp-b-benefits-grid">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 80} className="lp-b-benefit-card">
                        <div className="lp-b-benefit-check">&#10003;</div>
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'features': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Specifications';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-b-features">
                <div className="lp-b-container">
                  <RevealDiv><h2 className="lp-b-section-title">{title}</h2></RevealDiv>
                  <div className="lp-b-features-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-b-feature-row">
                        <span className="lp-b-feature-bullet" />
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'testimonials': {
            const items = (sec.data.items as Array<{ name: string; text: string; rating: number }>) || [];
            const title = (sec.data.title as string) || 'Customer Reviews';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-b-testimonials">
                <div className="lp-b-container">
                  <RevealDiv><h2 className="lp-b-section-title">{title}</h2></RevealDiv>
                  <div className="lp-b-testimonials-row">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 100} className="lp-b-testimonial-card">
                        <div className="lp-b-testimonial-stars">{'★'.repeat(item.rating || 5)}</div>
                        <p className="lp-b-testimonial-text">&ldquo;{item.text}&rdquo;</p>
                        <p className="lp-b-testimonial-name">— {item.name}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'gallery': {
            if (!product) return null;
            const extraUrls = (sec.data.urls as string[]) || [];
            const allImages = [...product.images.map((img) => img.url), ...extraUrls].slice(0, 8);
            if (allImages.length === 0) return null;
            return (
              <section key={sec.id} className="lp-b-gallery">
                <div className="lp-b-container">
                  <RevealDiv><h2 className="lp-b-section-title">Gallery</h2></RevealDiv>
                  <div className="lp-b-gallery-grid">
                    {allImages.map((url, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-b-gallery-item">
                        <img src={url} alt={`${product.name} ${j + 1}`} loading="lazy" />
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'faq': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'FAQ';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-b-faq">
                <div className="lp-b-container">
                  <RevealDiv><h2 className="lp-b-section-title">{title}</h2></RevealDiv>
                  <div className="lp-b-faq-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 50} className="lp-b-faq-item">{item}</RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          default: return null;
        }
      })}

      {/* CTA */}
      {product && (
        <section className="lp-b-cta">
          <div className="lp-b-container">
            <RevealDiv>
              <h2 className="lp-b-cta-title">{(ctaSection?.data?.heading as string) || 'Get Yours Today'}</h2>
              <p className="lp-b-cta-text">{(ctaSection?.data?.text as string) || "Don't miss out. Limited stock available."}</p>
              <div className="lp-b-cta-order"><ProductOrdering product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} /></div>
            </RevealDiv>
          </div>
        </section>
      )}

      {product && <FloatingCtaBar product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TEMPLATE C: Clean / Conversion
   Trust signals, clean layout, conversion-focused
   ═══════════════════════════════════════════════════ */
function TemplateC({ page }: { page: LandingPageData }) {
  const product = page.product;
  const sections = getSections(page.content);
  const heroSection = sections.find((s) => s.type === 'hero' && s.enabled);
  const otherSections = sections.filter((s) => s.type !== 'hero' && s.type !== 'cta' && s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const ctaSection = sections.find((s) => s.type === 'cta' && s.enabled);
  const heroHeading = (heroSection?.data?.heading as string) || page.title;
  const heroSubheading = (heroSection?.data?.subheading as string) || page.subtitle || '';
  const heroText = (heroSection?.data?.text as string) || '';

  return (
    <div className="lp-template-c">
      {/* Clean hero */}
      <section className="lp-c-hero">
        <div className="lp-c-hero-inner">
          <RevealDiv><span className="lp-c-eyebrow">Featured Product</span></RevealDiv>
          <RevealDiv delay={80}><h1 className="lp-c-hero-title">{heroHeading}</h1></RevealDiv>
          {heroSubheading && <RevealDiv delay={160}><p className="lp-c-hero-sub">{heroSubheading}</p></RevealDiv>}
          {heroText && <RevealDiv delay={240}><p className="lp-c-hero-text">{heroText}</p></RevealDiv>}
          {product && (
            <RevealDiv delay={320}>
              <div className="lp-c-hero-product">
                <div className="lp-c-hero-product-img-wrap">
                  {product.images?.[0] ? <img src={product.images[0].url} alt={product.name} className="lp-c-hero-product-img" />
                    : page.heroImageUrl ? <img src={page.heroImageUrl} alt="" className="lp-c-hero-product-img" />
                    : <div className="lp-c-hero-product-img lp-c-hero-product-img-empty" />}
                </div>
                <div className="lp-c-hero-product-info">
                  <ProductOrdering product={product} />
                </div>
              </div>
            </RevealDiv>
          )}
        </div>
      </section>

      {/* Trust bar */}
      <section className="lp-c-trust">
        <div className="lp-c-container">
          <RevealDiv>
            <div className="lp-c-trust-grid">
              <div className="lp-c-trust-item"><span className="lp-c-trust-icon">&#128274;</span><span>Secure Checkout</span></div>
              <div className="lp-c-trust-item"><span className="lp-c-trust-icon">&#128666;</span><span>Fast Delivery</span></div>
              <div className="lp-c-trust-item"><span className="lp-c-trust-icon">&#8617;&#65039;</span><span>Easy Returns</span></div>
              <div className="lp-c-trust-item"><span className="lp-c-trust-icon">&#128172;</span><span>24/7 Support</span></div>
            </div>
          </RevealDiv>
        </div>
      </section>

      {/* Dynamic sections */}
      {otherSections.map((sec) => {
        switch (sec.type) {
          case 'benefits': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Why You\'ll Love It';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-c-benefits">
                <div className="lp-c-container">
                  <RevealDiv><h2 className="lp-c-section-title">{title}</h2></RevealDiv>
                  <div className="lp-c-benefits-grid">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 80} className="lp-c-benefit-card">
                        <div className="lp-c-benefit-icon">&#10003;</div>
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'features': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Product Details';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-c-features">
                <div className="lp-c-container">
                  <RevealDiv><h2 className="lp-c-section-title">{title}</h2></RevealDiv>
                  <div className="lp-c-features-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-c-feature-item">
                        <span className="lp-c-feature-num">{j + 1}</span>
                        <p>{item}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'testimonials': {
            const items = (sec.data.items as Array<{ name: string; text: string; rating: number }>) || [];
            const title = (sec.data.title as string) || 'Happy Customers';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-c-testimonials">
                <div className="lp-c-container">
                  <RevealDiv><h2 className="lp-c-section-title">{title}</h2></RevealDiv>
                  <div className="lp-c-testimonials-grid">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 100} className="lp-c-testimonial-card">
                        <div className="lp-c-testimonial-stars">{'★'.repeat(item.rating || 5)}</div>
                        <p className="lp-c-testimonial-text">&ldquo;{item.text}&rdquo;</p>
                        <p className="lp-c-testimonial-name">— {item.name}</p>
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'gallery': {
            if (!product) return null;
            const extraUrls = (sec.data.urls as string[]) || [];
            const allImages = [...product.images.map((img) => img.url), ...extraUrls].slice(0, 8);
            if (allImages.length === 0) return null;
            return (
              <section key={sec.id} className="lp-c-gallery">
                <div className="lp-c-container">
                  <RevealDiv><h2 className="lp-c-section-title">See It In Detail</h2></RevealDiv>
                  <div className="lp-c-gallery-grid">
                    {allImages.map((url, j) => (
                      <RevealDiv key={j} delay={j * 60} className="lp-c-gallery-item">
                        <img src={url} alt={`${product.name} ${j + 1}`} loading="lazy" />
                      </RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case 'faq': {
            const items = (sec.data.items as string[]) || [];
            const title = (sec.data.title as string) || 'Got Questions?';
            if (items.length === 0) return null;
            return (
              <section key={sec.id} className="lp-c-faq">
                <div className="lp-c-container">
                  <RevealDiv><h2 className="lp-c-section-title">{title}</h2></RevealDiv>
                  <div className="lp-c-faq-list">
                    {items.map((item, j) => (
                      <RevealDiv key={j} delay={j * 50} className="lp-c-faq-item">{item}</RevealDiv>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          default: return null;
        }
      })}

      {/* CTA */}
      {product && (
        <section className="lp-c-cta">
          <div className="lp-c-container">
            <RevealDiv>
              <h2 className="lp-c-cta-title">{(ctaSection?.data?.heading as string) || 'Ready to Order?'}</h2>
              <p className="lp-c-cta-text">{(ctaSection?.data?.text as string) || 'Join thousands of satisfied customers.'}</p>
              <div className="lp-c-cta-order"><ProductOrdering product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} /></div>
            </RevealDiv>
          </div>
        </section>
      )}

      {product && <FloatingCtaBar product={product} ctaText={(ctaSection?.data?.buttonText as string) || 'Order Now'} />}
    </div>
  );
}

/* ─── Main page ─── */
export default function LandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/landing/${slug}`)
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (page) {
      document.title = `${page.title} | Order Now`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && page.metaDescription) metaDesc.setAttribute('content', page.metaDescription);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', page.title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && page.metaDescription) ogDesc.setAttribute('content', page.metaDescription);
      if (page.product?.images?.[0]) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', page.product.images[0].url);
      }
    }
  }, [page]);

  if (loading) return <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>;
  if (error || !page) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <h2>Page not found</h2>
      <Link href="/" style={{ color: 'var(--color-accent)' }}>Go to homepage</Link>
    </div>
  );

  return (
    <>
      <style>{`
        /* ── Global reveal animation ── */
        .lp-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-order-btn:hover { transform: scale(1.02) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.15); }
        .lp-floating-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--color-border); box-shadow: 0 -4px 20px rgba(0,0,0,0.08); padding: 10px 0; animation: lpSlideUp 0.3s ease; }
        .lp-floating-bar-inner { max-width: 600px; margin: 0 auto; padding: 0 16px; display: flex; align-items: center; gap: 16px; }
        .lp-floating-bar-name { font-weight: 700; font-size: 0.9rem; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lp-floating-bar-inner > div { flex: 1; margin: 0; }
        .lp-floating-bar-inner > div > * { margin-bottom: 0 !important; }
        @keyframes lpSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .lp-reveal { opacity: 1; transform: none; transition: none; } .lp-floating-bar { animation: none; } }
        .lp-a-container, .lp-b-container, .lp-c-container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }

        /* ══════ TEMPLATE A: Premium / Luxury ══════ */
        .lp-a-hero { position: relative; min-height: 70vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #fff; overflow: hidden; }
        .lp-a-hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.2; }
        .lp-a-hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,12,41,0.85), rgba(48,43,99,0.7)); }
        .lp-a-hero-content { position: relative; z-index: 1; text-align: center; max-width: 700px; padding: 80px 24px; }
        .lp-a-badge { display: inline-block; padding: 6px 20px; border: 1px solid rgba(255,215,0,0.4); border-radius: 30px; font-size: 0.8rem; letter-spacing: 3px; text-transform: uppercase; color: #ffd700; margin-bottom: 24px; }
        .lp-a-hero-title { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.1; margin: 0 0 16px; letter-spacing: -0.02em; }
        .lp-a-hero-sub { font-size: 1.15rem; opacity: 0.85; margin: 0 0 8px; }
        .lp-a-hero-text { font-size: 1rem; opacity: 0.7; margin: 0 0 32px; }
        .lp-a-hero-order { max-width: 380px; margin: 0 auto; background: rgba(255,255,255,0.08); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 24px; }
        .lp-a-showcase { padding: 80px 0; background: #fafafa; }
        .lp-a-showcase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .lp-a-showcase-img-wrap { border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
        .lp-a-showcase-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
        .lp-a-showcase-img-empty { display: flex; align-items: center; justify-content: center; background: #eee; color: #999; }
        .lp-a-category { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-text-muted); }
        .lp-a-showcase-title { font-size: 2rem; font-weight: 700; margin: 8px 0 16px; }
        .lp-a-showcase-desc { font-size: 1rem; line-height: 1.7; color: var(--color-text); margin-bottom: 24px; }
        .lp-a-section-title { font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 48px; }
        .lp-a-section-title--light { color: #fff; }
        .lp-a-benefits { padding: 80px 0; background: #fff; }
        .lp-a-benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
        .lp-a-benefit-card { background: linear-gradient(135deg, #f8f9fa, #fff); padding: 32px 24px; border-radius: 16px; border: 1px solid #eee; text-align: center; transition: transform 0.2s, box-shadow 0.2s; }
        .lp-a-benefit-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
        .lp-a-benefit-icon { font-size: 1.5rem; color: #ffd700; margin-bottom: 12px; }
        .lp-a-benefit-card p { font-size: 0.95rem; line-height: 1.6; margin: 0; }
        .lp-a-features { padding: 80px 0; background: linear-gradient(135deg, #0f0c29, #302b63); color: #fff; }
        .lp-a-features-list { max-width: 700px; margin: 0 auto; }
        .lp-a-feature-item { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .lp-a-feature-num { font-size: 0.8rem; font-weight: 700; color: #ffd700; min-width: 28px; }
        .lp-a-feature-item p { font-size: 0.95rem; line-height: 1.6; margin: 0; }
        .lp-a-testimonials { padding: 80px 0; background: #fafafa; }
        .lp-a-testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .lp-a-testimonial-card { background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: transform 0.2s; }
        .lp-a-testimonial-card:hover { transform: translateY(-2px); }
        .lp-a-testimonial-stars { color: #f59e0b; font-size: 1rem; margin-bottom: 12px; }
        .lp-a-testimonial-text { font-size: 0.95rem; line-height: 1.6; font-style: italic; margin: 0 0 12px; }
        .lp-a-testimonial-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); margin: 0; }
        .lp-a-gallery { padding: 80px 0; background: #fff; }
        .lp-a-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .lp-a-gallery-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; transition: transform 0.3s; }
        .lp-a-gallery-item:hover { transform: scale(1.03); }
        .lp-a-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
        .lp-a-faq { padding: 80px 0; background: #fafafa; }
        .lp-a-faq-list { max-width: 700px; margin: 0 auto; }
        .lp-a-faq-item { padding: 16px 0; border-bottom: 1px solid var(--color-border); font-size: 0.95rem; line-height: 1.6; }
        .lp-a-cta { padding: 80px 0; background: linear-gradient(135deg, #0f0c29, #302b63); color: #fff; text-align: center; }
        .lp-a-cta-title { font-size: 2.2rem; font-weight: 700; margin: 0 0 12px; }
        .lp-a-cta-text { font-size: 1.05rem; opacity: 0.85; margin: 0 0 32px; }
        .lp-a-cta-order { max-width: 400px; margin: 0 auto; }

        /* ══════ TEMPLATE B: Modern / Bold ══════ */
        .lp-b-hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 70vh; }
        .lp-b-hero-left { display: flex; flex-direction: column; justify-content: center; padding: 60px 8%; background: #fff; }
        .lp-b-hero-right { overflow: hidden; }
        .lp-b-hero-img { width: 100%; height: 100%; object-fit: cover; }
        .lp-b-hero-img-empty { background: linear-gradient(135deg, #667eea, #764ba2); }
        .lp-b-eyebrow { display: inline-block; padding: 4px 14px; background: var(--color-accent); color: #fff; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; width: fit-content; }
        .lp-b-hero-title { font-size: clamp(2rem, 4.5vw, 3.2rem); font-weight: 900; line-height: 1.1; margin: 0 0 16px; letter-spacing: -0.03em; }
        .lp-b-hero-sub { font-size: 1.1rem; color: var(--color-text-muted); margin: 0 0 12px; }
        .lp-b-hero-text { font-size: 0.95rem; line-height: 1.7; color: var(--color-text); margin: 0 0 28px; }
        .lp-b-hero-order { max-width: 380px; }
        .lp-b-stats { padding: 40px 0; background: var(--color-accent); color: #fff; }
        .lp-b-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; }
        .lp-b-stat-num { display: block; font-size: 1.6rem; font-weight: 800; }
        .lp-b-stat-label { font-size: 0.8rem; opacity: 0.85; }
        .lp-b-section-title { font-size: 2rem; font-weight: 800; text-align: center; margin: 0 0 48px; letter-spacing: -0.02em; }
        .lp-b-benefits { padding: 80px 0; background: #fff; }
        .lp-b-benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .lp-b-benefit-card { display: flex; gap: 12px; align-items: flex-start; padding: 20px; background: #f8f9fa; border-radius: 12px; transition: transform 0.2s; }
        .lp-b-benefit-card:hover { transform: translateY(-2px); }
        .lp-b-benefit-check { width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
        .lp-b-benefit-card p { font-size: 0.95rem; line-height: 1.5; margin: 0; }
        .lp-b-features { padding: 80px 0; background: #f8f9fa; }
        .lp-b-features-list { max-width: 700px; margin: 0 auto; }
        .lp-b-feature-row { display: flex; gap: 12px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
        .lp-b-feature-bullet { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); margin-top: 8px; flex-shrink: 0; }
        .lp-b-feature-row p { font-size: 0.95rem; line-height: 1.6; margin: 0; }
        .lp-b-testimonials { padding: 80px 0; background: #fff; }
        .lp-b-testimonials-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .lp-b-testimonial-card { padding: 28px; border: 2px solid #f0f0f0; border-radius: 16px; transition: border-color 0.2s; }
        .lp-b-testimonial-card:hover { border-color: var(--color-accent); }
        .lp-b-testimonial-stars { color: #f59e0b; font-size: 1rem; margin-bottom: 10px; }
        .lp-b-testimonial-text { font-size: 0.95rem; line-height: 1.6; font-style: italic; margin: 0 0 10px; }
        .lp-b-testimonial-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); margin: 0; }
        .lp-b-gallery { padding: 80px 0; background: #f8f9fa; }
        .lp-b-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .lp-b-gallery-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; transition: transform 0.3s; }
        .lp-b-gallery-item:hover { transform: scale(1.03); }
        .lp-b-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
        .lp-b-faq { padding: 80px 0; background: #fff; }
        .lp-b-faq-list { max-width: 700px; margin: 0 auto; }
        .lp-b-faq-item { padding: 16px 0; border-bottom: 1px solid var(--color-border); font-size: 0.95rem; line-height: 1.6; }
        .lp-b-cta { padding: 80px 0; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; }
        .lp-b-cta-title { font-size: 2.2rem; font-weight: 800; margin: 0 0 12px; }
        .lp-b-cta-text { font-size: 1.05rem; opacity: 0.9; margin: 0 0 32px; }
        .lp-b-cta-order { max-width: 400px; margin: 0 auto; }

        /* ══════ TEMPLATE C: Clean / Conversion ══════ */
        .lp-c-hero { padding: 80px 0 60px; background: linear-gradient(180deg, #f0f4f8, #fff); }
        .lp-c-hero-inner { max-width: 900px; margin: 0 auto; padding: 0 20px; text-align: center; }
        .lp-c-eyebrow { display: inline-block; padding: 4px 12px; background: rgba(0,123,255,0.08); color: var(--color-accent); border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }
        .lp-c-hero-title { font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; line-height: 1.15; margin: 0 0 12px; color: #1a1a2e; }
        .lp-c-hero-sub { font-size: 1.1rem; color: var(--color-text-muted); margin: 0 0 8px; }
        .lp-c-hero-text { font-size: 1rem; color: var(--color-text); margin: 0 0 40px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .lp-c-hero-product { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; text-align: left; max-width: 800px; margin: 0 auto; }
        .lp-c-hero-product-img-wrap { border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.08); }
        .lp-c-hero-product-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
        .lp-c-hero-product-img-empty { display: flex; align-items: center; justify-content: center; background: #eee; color: #999; }
        .lp-c-hero-product-info { padding-top: 8px; }
        .lp-c-trust { padding: 20px 0; background: #fff; border-bottom: 1px solid #eee; }
        .lp-c-trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }
        .lp-c-trust-item { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
        .lp-c-trust-icon { font-size: 1.1rem; }
        .lp-c-section-title { font-size: 2rem; font-weight: 700; text-align: center; margin: 0 0 48px; color: #1a1a2e; }
        .lp-c-benefits { padding: 80px 0; background: #fff; }
        .lp-c-benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .lp-c-benefit-card { display: flex; gap: 12px; align-items: flex-start; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; transition: border-color 0.2s, box-shadow 0.2s; }
        .lp-c-benefit-card:hover { border-color: var(--color-accent); box-shadow: 0 4px 16px rgba(0,123,255,0.08); }
        .lp-c-benefit-icon { width: 24px; height: 24px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .lp-c-benefit-card p { font-size: 0.95rem; line-height: 1.5; margin: 0; }
        .lp-c-features { padding: 80px 0; background: #f8fafc; }
        .lp-c-features-list { max-width: 700px; margin: 0 auto; }
        .lp-c-feature-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
        .lp-c-feature-num { width: 24px; height: 24px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .lp-c-feature-item p { font-size: 0.95rem; line-height: 1.6; margin: 0; }
        .lp-c-testimonials { padding: 80px 0; background: #fff; }
        .lp-c-testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .lp-c-testimonial-card { padding: 28px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; transition: transform 0.2s; }
        .lp-c-testimonial-card:hover { transform: translateY(-2px); }
        .lp-c-testimonial-stars { color: #f59e0b; font-size: 1rem; margin-bottom: 10px; }
        .lp-c-testimonial-text { font-size: 0.95rem; line-height: 1.6; font-style: italic; margin: 0 0 10px; }
        .lp-c-testimonial-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); margin: 0; }
        .lp-c-gallery { padding: 80px 0; background: #f8fafc; }
        .lp-c-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .lp-c-gallery-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; transition: transform 0.3s; }
        .lp-c-gallery-item:hover { transform: scale(1.03); }
        .lp-c-gallery-item img { width: 100%; height: 100%; object-fit: cover; }
        .lp-c-faq { padding: 80px 0; background: #fff; }
        .lp-c-faq-list { max-width: 700px; margin: 0 auto; }
        .lp-c-faq-item { padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; line-height: 1.6; }
        .lp-c-cta { padding: 80px 0; background: linear-gradient(135deg, var(--color-primary), #1a365d); color: #fff; text-align: center; }
        .lp-c-cta-title { font-size: 2.2rem; font-weight: 700; margin: 0 0 12px; }
        .lp-c-cta-text { font-size: 1.05rem; opacity: 0.9; margin: 0 0 32px; }
        .lp-c-cta-order { max-width: 400px; margin: 0 auto; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .lp-a-showcase-grid, .lp-c-hero-product { grid-template-columns: 1fr; gap: 32px; }
          .lp-b-hero { grid-template-columns: 1fr; }
          .lp-b-hero-right { max-height: 50vh; }
          .lp-b-stats-grid, .lp-c-trust-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-a-hero-content, .lp-b-hero-left, .lp-c-hero-inner { padding-left: 20px; padding-right: 20px; }
        }
        @media (max-width: 480px) {
          .lp-b-stats-grid, .lp-c-trust-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .lp-floating-bar-name { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-a-benefit-card, .lp-a-testimonial-card, .lp-a-gallery-item,
          .lp-b-benefit-card, .lp-b-gallery-item, .lp-b-testimonial-card,
          .lp-c-benefit-card, .lp-c-gallery-item, .lp-c-testimonial-card { transition: none !important; transform: none !important; }
        }
      `}</style>
      {(() => {
        switch (page.template) {
          case 'design_b': return <TemplateB page={page} />;
          case 'design_c': return <TemplateC page={page} />;
          default: return <TemplateA page={page} />;
        }
      })()}
    </>
  );
}
