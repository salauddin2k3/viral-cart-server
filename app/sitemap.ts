import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

async function fetchSitemapData(): Promise<{ products: Array<{ slug: string; updatedAt: string }>; categories: Array<{ slug: string; updatedAt: string }> }> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE}/api/products?limit=500`, { next: { revalidate: 3600 } }),
      fetch(`${API_BASE}/api/categories?limit=100`, { next: { revalidate: 3600 } }),
    ]);

    const products = productsRes.ok ? (await productsRes.json()).items ?? [] : [];
    const categories = categoriesRes.ok ? (await categoriesRes.json()).items ?? [] : [];

    return {
      products: products.map((p: { slug: string; updatedAt: string }) => ({ slug: p.slug, updatedAt: p.updatedAt })),
      categories: categories.map((c: { slug: string; updatedAt: string }) => ({ slug: c.slug, updatedAt: c.updatedAt })),
    };
  } catch {
    return { products: [], categories: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchSitemapData();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/all-products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/cart`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/checkout`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/track`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/returns`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  const productPages: MetadataRoute.Sitemap = data.products.map((p) => ({
    url: `${BASE_URL}/product/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = data.categories.map((c) => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
