import 'dotenv/config';
import express from 'express';
import path from 'path';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { getStaffSession } from './lib/guard.js';
import { errorEnvelope, HTTP_STATUS_BY_CODE, toAppError } from './types/api.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authAuditLogger } from './middleware/authAuditLogger.js';
import { signInThrottle } from './middleware/signinThrottle.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { cors } from './middleware/cors.js';
import { prisma } from './lib/prisma.js';
import adminCategoryRoutes from './routes/admin/categories.js';
import publicCategoryRoutes from './routes/categories.js';
import adminMediaRoutes from './routes/admin/media.js';
import adminProductRoutes from './routes/admin/products.js';
import adminStockRoutes from './routes/admin/stock.js';
import adminOrderStatusRoutes from './routes/admin/orderStatus.js';
import adminOrdersRoutes from './routes/admin/orders.js';
import adminLeadsRoutes from './routes/admin/leads.js';
import adminStaffRoutes from './routes/admin/staff.js';
import adminHeroRoutes from './routes/admin/hero.js';
import adminHeroUploadRoutes from './routes/admin/heroUpload.js';
import adminDeliveryRoutes from './routes/admin/delivery.js';
import adminVariantRoutes from './routes/admin/variants.js';
import publicProductRoutes from './routes/products.js';
import publicHeroRoutes from './routes/hero.js';
import orderRoutes from './routes/orders.js';
import trackingRoutes from './routes/tracking.js';
import checkoutRoutes from './routes/checkout.js';
import publicDeliveryRoutes from './routes/delivery.js';
import adminLandingPageRoutes from './routes/admin/landingPages.js';
import adminLandingPageUploadRoutes from './routes/admin/landingPageUpload.js';
import adminAnalyticsRoutes from './routes/admin/analytics.js';
import publicLandingPageRoutes from './routes/landingPages.js';
import { seedPreWrittenLandingPages } from './lib/seed-landing-pages.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors);
app.use(requestLogger);
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(authAuditLogger);
app.use(signInThrottle);
app.use('/api/auth', toNodeHandler(auth.handler));

app.get('/api/me', async (req, res) => {
  try {
    const staff = await getStaffSession(req);
    if (!staff) {
      res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }
    res.json({
      user: {
        id: staff.user.id,
        name: staff.user.name,
        email: staff.user.email,
        role: staff.user.role,
        status: staff.user.status,
        mustChangePassword: staff.user.mustChangePassword,
        permissions: staff.user.permissions,
      },
    });
  } catch {
    res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
  }
});

app.use('/api/categories', publicCategoryRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/media', adminMediaRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/stock', adminStockRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/orders', adminOrderStatusRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/staff', adminStaffRoutes);
app.use('/api/admin/hero', adminHeroRoutes);
app.use('/api/admin/hero-upload', adminHeroUploadRoutes);
app.use('/api/admin/delivery', adminDeliveryRoutes);
app.use('/api/admin/products', adminVariantRoutes);
app.use('/api/products', publicProductRoutes);
app.use('/api/hero', publicHeroRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/delivery', publicDeliveryRoutes);
app.use('/api/admin/landing-pages', adminLandingPageRoutes);
app.use('/api/admin/landing-page-upload', adminLandingPageUploadRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/landing', publicLandingPageRoutes);

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

app.get('/healthz', async (_req, res) => {
  const db = await isDatabaseReachable();
  res.status(200).json({ status: 'ok', db });
});

const storageDir = process.env.STORAGE_DIR ?? path.join(process.cwd(), 'storage');
app.use('/storage', express.static(storageDir, { maxAge: '1y', immutable: true }));

app.use((_req, res) => {
  res.status(404).json(errorEnvelope('NOT_FOUND', 'Route not found'));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const appError = toAppError(err);
  const correlationId = res.locals.correlationId as string | undefined;
  if (appError.code === 'INTERNAL') {
    console.error(JSON.stringify({ msg: 'unhandled_error', correlationId, detail: String(err) }));
  }
  const body = errorEnvelope(appError.code, appError.message);
  if (correlationId) {
    res.setHeader('X-Correlation-Id', correlationId);
  }
  res.status(HTTP_STATUS_BY_CODE[appError.code]).json(body);
});

const PORT = Number.parseInt(process.env.PORT ?? '5000', 10);

function start(): void {
  app.listen(PORT, () => {
    console.log(JSON.stringify({ msg: 'server_started', port: PORT }));
    seedPreWrittenLandingPages();
  });
}

start();
