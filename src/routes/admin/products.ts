import { Router } from 'express';
import { prisma, Prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';
import { AppError } from '../../types/api.js';
import { productCreateSchema, productUpdateSchema } from '../../lib/validate.js';
import { generateSlug, ensureUniqueSlug } from '../../lib/slug.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
import { calculateFinalPrice } from '../../lib/money.js';


const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_VIEW');

    const { limit, cursor } = parsePaginationParams(req.query);
    const status = (req.query.status as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const where: Prisma.ProductWhereInput = {};
    where.deletedAt = null;
    if (status) where.status = status as 'active' | 'inactive';
    if (categoryId) {
      const subcats = await prisma.category.findMany({
        where: { parentCategoryId: categoryId },
        select: { id: true },
      });
      const catIds = [categoryId, ...subcats.map((c) => c.id)];
      where.categoryId = { in: catIds };
    }
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
    });

    const hasMore = items.length > limit + 1;
    const page = hasMore ? items.slice(0, limit) : items;
    const response = buildPaginationResult(page, limit, hasMore);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_CREATE');
    const parsed = productCreateSchema.parse(req.body);

    const existingSlugs = (
      await prisma.product.findMany({ select: { slug: true } })
    ).map((p: { slug: string }) => p.slug);

    const slug = ensureUniqueSlug(
      parsed.slug && parsed.slug.length > 0 ? parsed.slug : generateSlug(parsed.name),
      existingSlugs,
    );

    const finalPrice = parsed.discountEnabled
      ? calculateFinalPrice(parsed.regularPrice, parsed.discountPercent)
      : parsed.regularPrice;

    if (parsed.variants && parsed.variants.length > 0) {
      const variantSkus = parsed.variants.filter((v) => v.sku).map((v) => v.sku!);
      if (variantSkus.length > 0) {
        const existingSkus = await prisma.productVariant.findMany({
          where: { sku: { in: variantSkus } },
          select: { sku: true },
        });
        if (existingSkus.length > 0) {
          throw new AppError('CONFLICT', `Duplicate variant SKU: ${existingSkus.map((s) => s.sku).join(', ')}`);
        }
        const existingProductSkus = await prisma.product.findMany({
          where: { sku: { in: variantSkus } },
          select: { sku: true },
        });
        if (existingProductSkus.length > 0) {
          throw new AppError('CONFLICT', `Variant SKU conflicts with product SKU: ${existingProductSkus.map((s) => s.sku).join(', ')}`);
        }
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: parsed.name,
          sku: parsed.sku,
          slug,
          nameSearch: parsed.name,
          categoryId: parsed.categoryId,
          shortDescription: parsed.shortDescription,
          fullDescription: parsed.fullDescription,
          regularPrice: new Prisma.Decimal(parsed.regularPrice),
          discountEnabled: parsed.discountEnabled,
          discountPercent: parsed.discountPercent,
          finalPrice: new Prisma.Decimal(finalPrice),
          stock: parsed.stock,
          trackInventory: parsed.trackInventory,
          lowStockThreshold: parsed.lowStockThreshold,
          featuredFlag: parsed.featuredFlag,
          bestSellerRank: parsed.bestSellerRank,
          status: parsed.status,
        },
      });

      if (parsed.variants && parsed.variants.length > 0) {
        for (const v of parsed.variants) {
          const vFinalPrice = v.regularPrice;
          await tx.productVariant.create({
            data: {
              productId: created.id,
              name: v.name,
              sku: v.sku,
              regularPrice: new Prisma.Decimal(v.regularPrice),
              discountEnabled: false,
              discountPercent: 0,
              finalPrice: new Prisma.Decimal(vFinalPrice),
              stock: v.stock,
              sortOrder: v.sortOrder,
            },
          });
        }
      }

      return created;
    });

    const result = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'product_created',
        entityType: 'product',
        entityId: product.id,
        metadata: { name: product.name, sku: product.sku, slug: product.slug, variantCount: parsed.variants?.length ?? 0 },
      },
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_VIEW');
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_UPDATE');
    const { id } = req.params;
    const parsed = productUpdateSchema.parse(req.body);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    if (parsed.variants && parsed.variants.length > 0) {
      const variantSkus = parsed.variants.filter((v) => v.sku).map((v) => v.sku!);
      if (variantSkus.length > 0) {
        const existingSkus = await prisma.productVariant.findMany({
          where: { sku: { in: variantSkus }, productId: { not: id } },
          select: { sku: true },
        });
        if (existingSkus.length > 0) {
          throw new AppError('CONFLICT', `Duplicate variant SKU: ${existingSkus.map((s) => s.sku).join(', ')}`);
        }
        const existingProductSkus = await prisma.product.findMany({
          where: { sku: { in: variantSkus }, id: { not: id } },
          select: { sku: true },
        });
        if (existingProductSkus.length > 0) {
          throw new AppError('CONFLICT', `Variant SKU conflicts with product SKU: ${existingProductSkus.map((s) => s.sku).join(', ')}`);
        }
      }
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.sku !== undefined) updateData.sku = parsed.sku;
    if (parsed.categoryId !== undefined) updateData.categoryId = parsed.categoryId;
    if (parsed.shortDescription !== undefined) updateData.shortDescription = parsed.shortDescription;
    if (parsed.fullDescription !== undefined) updateData.fullDescription = parsed.fullDescription;
    if (parsed.regularPrice !== undefined) updateData.regularPrice = new Prisma.Decimal(parsed.regularPrice);
    if (parsed.discountEnabled !== undefined) updateData.discountEnabled = parsed.discountEnabled;
    if (parsed.discountPercent !== undefined) updateData.discountPercent = parsed.discountPercent;
    if (parsed.stock !== undefined) updateData.stock = parsed.stock;
    if (parsed.trackInventory !== undefined) updateData.trackInventory = parsed.trackInventory;
    if (parsed.lowStockThreshold !== undefined) updateData.lowStockThreshold = parsed.lowStockThreshold;
    if (parsed.featuredFlag !== undefined) updateData.featuredFlag = parsed.featuredFlag;
    if (parsed.bestSellerRank !== undefined) updateData.bestSellerRank = parsed.bestSellerRank;
    if (parsed.status !== undefined) updateData.status = parsed.status;

    if (parsed.name) {
      const autoSlug = generateSlug(parsed.name);
      const existingSlugs = (
        await prisma.product.findMany({
          select: { slug: true },
          where: { id: { not: id } },
        })
      ).map((p: { slug: string }) => p.slug);
      updateData.slug = ensureUniqueSlug(autoSlug, existingSlugs);
      updateData.nameSearch = parsed.name;
    }

    if (parsed.slug) {
      const existingSlugs = (
        await prisma.product.findMany({
          select: { slug: true },
          where: { id: { not: id } },
        })
      ).map((p: { slug: string }) => p.slug);
      updateData.slug = ensureUniqueSlug(parsed.slug, existingSlugs);
    }

    const regularPrice = (updateData.regularPrice as Prisma.Decimal) ?? existing.regularPrice;
    const discountEnabled = (updateData.discountEnabled as boolean) ?? existing.discountEnabled;
    const discountPercent = (updateData.discountPercent as number) ?? existing.discountPercent;

    const finalPrice = discountEnabled
      ? calculateFinalPrice(Number(regularPrice), discountPercent)
      : Number(regularPrice);
    updateData.finalPrice = new Prisma.Decimal(finalPrice);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (parsed.variants !== undefined) {
      const incomingIds = parsed.variants.filter((v) => v.id).map((v) => v.id!);
      const existingVariants = await prisma.productVariant.findMany({ where: { productId: id } });

      for (const ev of existingVariants) {
        if (!incomingIds.includes(ev.id)) {
          const orderItemCount = await prisma.orderItem.count({ where: { variantId: ev.id } });
          if (orderItemCount === 0) {
            await prisma.productVariant.delete({ where: { id: ev.id } });
          }
        }
      }

      for (const v of parsed.variants) {
        const vFinalPrice = v.regularPrice;
        if (v.id) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku,
              regularPrice: new Prisma.Decimal(v.regularPrice),
              finalPrice: new Prisma.Decimal(vFinalPrice),
              stock: v.stock,
              sortOrder: v.sortOrder,
            },
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId: id,
              name: v.name,
              sku: v.sku,
              regularPrice: new Prisma.Decimal(v.regularPrice),
              discountEnabled: false,
              discountPercent: 0,
              finalPrice: new Prisma.Decimal(vFinalPrice),
              stock: v.stock,
              sortOrder: v.sortOrder,
            },
          });
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'product_updated',
        entityType: 'product',
        entityId: product.id,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_TOGGLE_STATUS');
    const { id } = req.params;
    const { status } = req.body as { status: 'active' | 'inactive' };

    if (status !== 'active' && status !== 'inactive') {
      throw new AppError('BAD_REQUEST', 'Status must be active or inactive');
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'product_status_changed',
        entityType: 'product',
        entityId: product.id,
        metadata: { from: existing.status, to: status },
      },
    });

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'PRODUCTS_DELETE');
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

    if (orderItemCount > 0) {
      await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'inactive' },
      });

      await prisma.activityLog.create({
        data: {
          actorId: staff.user.id,
          actorRole: staff.user.role,
          action: 'product_soft_deleted',
          entityType: 'product',
          entityId: id,
          metadata: { name: existing.name, orderItemCount },
        },
      });

      res.json({ deleted: true, soft: true, message: 'Product deactivated (referenced by orders)' });
    } else {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });

      await prisma.activityLog.create({
        data: {
          actorId: staff.user.id,
          actorRole: staff.user.role,
          action: 'product_hard_deleted',
          entityType: 'product',
          entityId: id,
          metadata: { name: existing.name },
        },
      });

      res.json({ deleted: true, soft: false });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
