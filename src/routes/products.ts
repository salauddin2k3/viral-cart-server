import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../types/api';
import { parsePaginationParams, buildPaginationResult } from '../lib/cursor';
import { deriveStockStatus } from '../lib/stock';
import { Prisma } from '@prisma/client';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const categorySlug = (req.query.category as string) || undefined;
    const search = (req.query.search as string) || undefined;
    const sort = (req.query.sort as string) || 'newest';

    const where: Prisma.ProductWhereInput = { status: 'active', deletedAt: null };

    if (categorySlug) {
      const cat = await prisma.category.findFirst({
        where: { slug: categorySlug, status: 'active' },
        select: { id: true },
      });
      if (!cat) {
        res.json({ items: [], nextCursor: null });
        return;
      }
      where.categoryId = cat.id;
    }

    if (search) {
      where.nameSearch = { contains: search, mode: 'insensitive' };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case 'price_asc':
        orderBy = { regularPrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { regularPrice: 'desc' };
        break;
      case 'popular':
        orderBy = { bestSellerRank: { sort: 'asc', nulls: 'last' } };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const items = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
    });

    const hasMore = items.length > limit + 1;
    const page = hasMore ? items.slice(0, limit) : items;

    const enriched = page.map((p) => ({
      ...p,
      stockStatus: deriveStockStatus(p.stock, p.lowStockThreshold),
    }));

    const response = buildPaginationResult(enriched, limit, hasMore);

    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=15');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { status: 'active' }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        status: 'active',
        deletedAt: null,
        id: { not: product.id },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    const enrichedRelated = related.map((p) => ({
      ...p,
      stockStatus: deriveStockStatus(p.stock, p.lowStockThreshold),
    }));

    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=15');
    res.json({
      ...product,
      stockStatus: deriveStockStatus(product.stock, product.lowStockThreshold),
      related: enrichedRelated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
