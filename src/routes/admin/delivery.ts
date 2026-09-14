import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requirePermission } from '../../lib/guard.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'DELIVERY_SETTINGS_VIEW');

    let setting = await prisma.deliverySetting.findFirst();
    if (!setting) {
      setting = await prisma.deliverySetting.create({ data: {} });
    }

    res.json({
      id: setting.id,
      insideDhakaNormal: Number(setting.insideDhakaNormal),
      dhakaSubNormal: Number(setting.dhakaSubNormal),
      outsideDhakaNormal: Number(setting.outsideDhakaNormal),
      insideDhakaExpress: Number(setting.insideDhakaExpress),
      expressEnabled: setting.expressEnabled,
      updatedAt: setting.updatedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    requirePermission(staff, 'DELIVERY_SETTINGS_UPDATE');

    const { insideDhakaNormal, dhakaSubNormal, outsideDhakaNormal, insideDhakaExpress, expressEnabled } = req.body;

    let setting = await prisma.deliverySetting.findFirst();
    if (!setting) {
      setting = await prisma.deliverySetting.create({ data: {} });
    }

    const updated = await prisma.deliverySetting.update({
      where: { id: setting.id },
      data: {
        ...(insideDhakaNormal !== undefined && { insideDhakaNormal: Number(insideDhakaNormal) }),
        ...(dhakaSubNormal !== undefined && { dhakaSubNormal: Number(dhakaSubNormal) }),
        ...(outsideDhakaNormal !== undefined && { outsideDhakaNormal: Number(outsideDhakaNormal) }),
        ...(insideDhakaExpress !== undefined && { insideDhakaExpress: Number(insideDhakaExpress) }),
        ...(expressEnabled !== undefined && { expressEnabled: Boolean(expressEnabled) }),
      },
    });

    res.json({
      id: updated.id,
      insideDhakaNormal: Number(updated.insideDhakaNormal),
      dhakaSubNormal: Number(updated.dhakaSubNormal),
      outsideDhakaNormal: Number(updated.outsideDhakaNormal),
      insideDhakaExpress: Number(updated.insideDhakaExpress),
      expressEnabled: updated.expressEnabled,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

export default router;
