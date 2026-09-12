import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await prisma.landingPage.findFirst({
      where: { slug, active: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            regularPrice: true,
            finalPrice: true,
            discountEnabled: true,
            discountPercent: true,
            stock: true,
            trackInventory: true,
            images: { orderBy: { sortOrder: 'asc' }, select: { url: true, altText: true } },
            category: { select: { name: true, slug: true } },
            variants: { select: { id: true, name: true, sku: true, regularPrice: true, finalPrice: true, discountEnabled: true, discountPercent: true, stock: true } },
          },
        },
      },
    });

    if (!page) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Landing page not found' } });
      return;
    }

    // Fire-and-forget impression increment
    prisma.landingPage.update({ where: { id: page.id }, data: { impressions: { increment: 1 } } }).catch(() => {});

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json(page);
  } catch (err) {
    next(err);
  }
});

router.post('/:slug/conversion', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await prisma.landingPage.findFirst({ where: { slug, active: true }, select: { id: true } });
    if (!page) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Landing page not found' } });
      return;
    }

    await prisma.landingPage.update({ where: { id: page.id }, data: { conversions: { increment: 1 } } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
