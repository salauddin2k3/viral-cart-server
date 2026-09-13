import 'dotenv/config';
import express from 'express';
import path from 'path';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { getStaffSession } from './lib/guard';
import { errorEnvelope, HTTP_STATUS_BY_CODE, toAppError } from './types/api';
import { requestLogger } from './middleware/requestLogger';
import { authAuditLogger } from './middleware/authAuditLogger';
import { signInThrottle } from './middleware/signinThrottle';
import { securityHeaders } from './middleware/securityHeaders';
import { cors } from './middleware/cors';
import { prisma } from './lib/prisma';
import adminCategoryRoutes from './routes/admin/categories';
import publicCategoryRoutes from './routes/categories';
import adminMediaRoutes from './routes/admin/media';
import adminProductRoutes from './routes/admin/products';
import adminStockRoutes from './routes/admin/stock';
import adminOrderStatusRoutes from './routes/admin/orderStatus';
import adminOrdersRoutes from './routes/admin/orders';
import adminLeadsRoutes from './routes/admin/leads';
import adminStaffRoutes from './routes/admin/staff';
import adminHeroRoutes from './routes/admin/hero';
import adminHeroUploadRoutes from './routes/admin/heroUpload';
import adminDeliveryRoutes from './routes/admin/delivery';
import adminVariantRoutes from './routes/admin/variants';
import publicProductRoutes from './routes/products';
import publicHeroRoutes from './routes/hero';
import orderRoutes from './routes/orders';
import trackingRoutes from './routes/tracking';
import checkoutRoutes from './routes/checkout';
import publicDeliveryRoutes from './routes/delivery';
import adminLandingPageRoutes from './routes/admin/landingPages';
import adminLandingPageUploadRoutes from './routes/admin/landingPageUpload';
import adminAnalyticsRoutes from './routes/admin/analytics';
import publicLandingPageRoutes from './routes/landingPages';
import { seedPreWrittenLandingPages } from './lib/seed-landing-pages';

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

if (!process.env.VERCEL) {
  const PORT = Number.parseInt(process.env.PORT ?? '5000', 10);
  app.listen(PORT, () => {
    console.log(JSON.stringify({ msg: 'server_started', port: PORT }));
    seedPreWrittenLandingPages();
  });
}

export default app;
