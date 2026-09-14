import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { parsePaginationParams, buildPaginationResult } from '../lib/cursor.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const take = limit + 1;

    const items = await prisma.category.findMany({
      where: { status: 'active', parentCategoryId: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        subcategories: {
          where: { status: 'active' },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
      },
      take,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor.value } }
        : {}),
    });

    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, limit) : items;
    const response = buildPaginationResult(page, limit, hasMore);

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/all', async (_req, res, next) => {
  try {
    const items = await prisma.category.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, imageUrl: true, parentCategoryId: true },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await prisma.category.findFirst({
      where: { slug, status: 'active' },
      select: { id: true, name: true, slug: true, imageUrl: true, parentCategoryId: true },
    });

    if (!category) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json(category);
  } catch (err) {
    next(err);
  }
});

export default router;
