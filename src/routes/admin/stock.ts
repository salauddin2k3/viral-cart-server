import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../lib/guard';
import { adjustStock } from '../../lib/stockService';
import { AppError } from '../../types/api';

const router = Router();

const adjustSchema = z.object({
  stock: z.number().int().min(0),
  reason: z.string().trim().min(1).max(500),
});

router.patch('/:productId/stock', async (req, res, next) => {
  try {
    const staff = await requireAuth(req, 'admin');
    const { productId } = req.params;
    const parsed = adjustSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    await adjustStock(
      prisma,
      productId,
      parsed.stock,
      parsed.reason,
      staff.user.id,
      staff.user.role,
    );

    const updated = await prisma.product.findUnique({ where: { id: productId } });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
