import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
router.get('/', async (_req, res, next) => {
    try {
        let setting = await prisma.deliverySetting.findFirst();
        if (!setting) {
            setting = await prisma.deliverySetting.create({ data: {} });
        }
        res.json({
            insideDhakaNormal: Number(setting.insideDhakaNormal),
            dhakaSubNormal: Number(setting.dhakaSubNormal),
            outsideDhakaNormal: Number(setting.outsideDhakaNormal),
            insideDhakaExpress: Number(setting.insideDhakaExpress),
            expressEnabled: setting.expressEnabled,
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=delivery.js.map