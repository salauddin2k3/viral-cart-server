import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export async function generateProductMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  try {
    const res = await fetch(`${API_BASE}/api/products/${slug}`);
    if (!res.ok) return { title: 'Product Not Found' };
    const product = await res.json();

    const imageUrl = product.images?.[0]?.url;
    const description = product.shortDescription || `Shop ${product.name} online. ${product.discountEnabled ? `${product.discountPercent}% off!` : ''}`;

    return {
      title: product.name,
      description,
      openGraph: {
        title: product.name,
        description,
        url: `${BASE_URL}/product/${slug}`,
        type: 'website',
        images: imageUrl ? [{ url: imageUrl, width: 800, height: 800, alt: product.name }] : [],
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export async function generateCategoryMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  try {
    const res = await fetch(`${API_BASE}/api/categories/${slug}`);
    if (!res.ok) return { title: 'Category Not Found' };
    const category = await res.json();

    return {
      title: category.name,
      description: `Browse ${category.name} products online.`,
      openGraph: {
        title: category.name,
        description: `Browse ${category.name} products online.`,
        url: `${BASE_URL}/category/${slug}`,
      },
    };
  } catch {
    return { title: 'Category' };
  }
}
