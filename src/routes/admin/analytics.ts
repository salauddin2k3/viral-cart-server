import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, requirePermission, hasPermission, type StaffContext } from '../../lib/guard';

const router = Router();

const VALID_PERIODS = ['7d', '30d', '90d'] as const;
type Period = typeof VALID_PERIODS[number];

function getPeriodDate(period: string): Date {
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function buildDashboardAnalytics(period: Period) {
  const since = getPeriodDate(period);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    todayOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    totalProducts,
    activeProducts,
    totalCategories,
    revenueAgg,
    todayRevenueAgg,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: 'Pending' } }),
    prisma.order.count({ where: { status: 'Delivered' } }),
    prisma.order.count({ where: { status: 'Cancelled' } }),
    prisma.order.count({ where: { status: 'Returned' } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, status: 'active' } }),
    prisma.category.count(),
    prisma.order.aggregate({
      where: { status: { in: ['Delivered', 'Confirmed'] } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ['Delivered', 'Confirmed'] },
        createdAt: { gte: todayStart },
      },
      _sum: { total: true },
    }),
  ]);

  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const revenueByDayRows = await prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
    SELECT
      TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
      COALESCE(SUM(CASE WHEN "status" IN ('DELIVERED', 'CONFIRMED') THEN "total" ELSE 0 END), 0)::float AS revenue,
      COUNT(*)::int AS orders
    FROM "order"
    WHERE "createdAt" >= ${since}
    GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
    ORDER BY date ASC
  `;

  const topProducts = await prisma.orderItem.groupBy({
    by: ['productName'],
    where: { order: { createdAt: { gte: since } } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const topProductsWithCategory = await Promise.all(
    topProducts.map(async (tp) => {
      const item = await prisma.orderItem.findFirst({
        where: { productName: tp.productName },
        include: { product: { select: { category: { select: { name: true } } } } },
      });
      return {
        name: tp.productName,
        totalSold: tp._sum.quantity ?? 0,
        revenue: Number(tp._sum.lineTotal ?? 0),
        category: item?.product?.category?.name ?? 'Unknown',
      };
    }),
  );

  const categoryPerformanceRows = await prisma.$queryRaw<
    { category: string; productCount: number; totalSold: number; revenue: number }[]
  >`
    SELECT
      c."name" AS category,
      COUNT(DISTINCT p."id")::int AS "productCount",
      COALESCE(SUM(oi."quantity"), 0)::int AS "totalSold",
      COALESCE(SUM(oi."lineTotal"), 0)::float AS revenue
    FROM "category" c
    LEFT JOIN "product" p ON p."categoryId" = c."id"
    LEFT JOIN "order_item" oi ON oi."productId" = p."id"
      AND oi."orderId" IN (SELECT "id" FROM "order" WHERE "createdAt" >= ${since})
    GROUP BY c."name"
    HAVING COUNT(DISTINCT p."id") > 0 OR SUM(oi."quantity") > 0
    ORDER BY "totalSold" DESC
  `;

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      total: true,
      status: true,
      deliveryMethod: true,
      createdAt: true,
      items: { select: { productName: true, quantity: true } },
    },
  });

  return {
    summary: {
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      totalProducts,
      activeProducts,
      totalCategories,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      todayRevenue: Number(todayRevenueAgg._sum.total ?? 0),
    },
    ordersByStatus: ordersByStatus.map((o) => ({
      status: o.status,
      count: o._count.id,
    })),
    revenueByDay: revenueByDayRows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: r.orders,
    })),
    topProducts: topProductsWithCategory,
    categoryPerformance: categoryPerformanceRows.map((c) => ({
      category: c.category,
      productCount: c.productCount,
      totalSold: c.totalSold,
      revenue: Number(c.revenue),
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: Number(o.total),
      status: o.status,
      deliveryMethod: o.deliveryMethod,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
      })),
    })),
  };
}

async function buildModeratorAnalytics(staff: StaffContext, period: Period) {
  const since = getPeriodDate(period);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const canOrders = hasPermission(staff, 'ORDERS_VIEW');
  const canProducts = hasPermission(staff, 'PRODUCTS_VIEW');
  const canCategories = hasPermission(staff, 'CATEGORIES_VIEW');

  const result: Record<string, unknown> = {};

  if (canOrders) {
    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      revenueAgg,
      todayRevenueAgg,
      ordersByStatus,
      revenueByDayRows,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: 'Pending' } }),
      prisma.order.count({ where: { status: 'Delivered' } }),
      prisma.order.count({ where: { status: 'Cancelled' } }),
      prisma.order.count({ where: { status: 'Returned' } }),
      prisma.order.aggregate({
        where: { status: { in: ['Delivered', 'Confirmed'] } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: ['Delivered', 'Confirmed'] },
          createdAt: { gte: todayStart },
        },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM-DD') AS date,
          COALESCE(SUM(CASE WHEN "status" IN ('DELIVERED', 'CONFIRMED') THEN "total" ELSE 0 END), 0)::float AS revenue,
          COUNT(*)::int AS orders
        FROM "order"
        WHERE "createdAt" >= ${since}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          total: true,
          status: true,
          deliveryMethod: true,
          createdAt: true,
          items: { select: { productName: true, quantity: true } },
        },
      }),
    ]);

    result.summary = {
      totalOrders,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      todayRevenue: Number(todayRevenueAgg._sum.total ?? 0),
    };
    result.ordersByStatus = ordersByStatus.map((o) => ({
      status: o.status,
      count: o._count.id,
    }));
    result.revenueByDay = revenueByDayRows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: r.orders,
    }));
    result.recentOrders = recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      total: Number(o.total),
      status: o.status,
      deliveryMethod: o.deliveryMethod,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
      })),
    }));
  }

  if (canProducts) {
    const [totalProducts, activeProducts, topProducts] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: { createdAt: { gte: since } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    const topProductsWithCategory = await Promise.all(
      topProducts.map(async (tp) => {
        const item = await prisma.orderItem.findFirst({
          where: { productName: tp.productName },
          include: { product: { select: { category: { select: { name: true } } } } },
        });
        return {
          name: tp.productName,
          totalSold: tp._sum.quantity ?? 0,
          revenue: Number(tp._sum.lineTotal ?? 0),
          category: item?.product?.category?.name ?? 'Unknown',
        };
      }),
    );

    result.topProducts = topProductsWithCategory;
    if (!result.summary) {
      result.summary = {};
    }
    (result.summary as Record<string, unknown>).totalProducts = totalProducts;
    (result.summary as Record<string, unknown>).activeProducts = activeProducts;
  }

  if (canCategories) {
    const categoryPerformanceRows = await prisma.$queryRaw<
      { category: string; productCount: number; totalSold: number; revenue: number }[]
    >`
      SELECT
        c."name" AS category,
        COUNT(DISTINCT p."id")::int AS "productCount",
        COALESCE(SUM(oi."quantity"), 0)::int AS "totalSold",
        COALESCE(SUM(oi."lineTotal"), 0)::float AS revenue
      FROM "category" c
      LEFT JOIN "product" p ON p."categoryId" = c."id"
      LEFT JOIN "order_item" oi ON oi."productId" = p."id"
        AND oi."orderId" IN (SELECT "id" FROM "order" WHERE "createdAt" >= ${since})
      GROUP BY c."name"
      HAVING COUNT(DISTINCT p."id") > 0 OR SUM(oi."quantity") > 0
      ORDER BY "totalSold" DESC
    `;

    result.categoryPerformance = categoryPerformanceRows.map((c) => ({
      category: c.category,
      productCount: c.productCount,
      totalSold: c.totalSold,
      revenue: Number(c.revenue),
    }));
  }

  return result;
}

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'ORDERS_VIEW');

    const period = (req.query.period as string) || '30d';
    const validPeriod: Period = VALID_PERIODS.includes(period as Period)
      ? (period as Period)
      : '30d';

    const data = await buildDashboardAnalytics(validPeriod);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/moderator', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'ORDERS_VIEW');

    const period = (req.query.period as string) || '30d';
    const validPeriod: Period = VALID_PERIODS.includes(period as Period)
      ? (period as Period)
      : '30d';

    const data = await buildModeratorAnalytics(staff, validPeriod);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
