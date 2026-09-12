import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, getStaffSession, canManageUser, canCreateRole, requirePermission, MODERATOR_DEFAULT_PERMISSIONS } from '../../lib/guard.js';
import { auth } from '../../lib/auth.js';
import { AppError, toAppError } from '../../types/api.js';
import { parsePaginationParams, buildPaginationResult } from '../../lib/cursor.js';
import { createRateLimiter } from '../../lib/rateLimit.js';

const router = Router();

const staffMutationLimiter = createRateLimiter({ windowMs: 60_000, max: 10 }, 'staff_mutation');

const staffCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['moderator']).default('moderator'),
});

router.get('/', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);

    if (staff.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions');
    }

    const { limit, cursor } = parsePaginationParams(req.query);
    const take = limit + 1;

    const items = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' as const },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor.value } } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mustChangePassword: true,
        permissions: true,
        createdAt: true,
      },
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const response = buildPaginationResult(page, limit, hasMore);

    res.json(response);
  } catch (error) {
    next(toAppError(error));
  }
});

router.post('/', staffMutationLimiter, async (req, res, next) => {
  try {
    const staff = await requireAuth(req);

    if (staff.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admin can create staff accounts');
    }

    const parsed = staffCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('BAD_REQUEST', 'Invalid input');
    }

    const { name, email, password, role } = parsed.data;

    if (!canCreateRole(staff, role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You do not have permission to create accounts');
    }

    const permissions = [...MODERATOR_DEFAULT_PERMISSIONS];

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new AppError('CONFLICT', 'Email already in use');
    }

    const context = await auth.$context;
    const hashedPassword = await context.password.hash(password);
    const now = new Date();
    const userId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: true,
        role: 'moderator',
        status: 'active',
        mustChangePassword: false,
        permissions: permissions,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.account.create({
      data: {
        id: randomUUID(),
        issuer: 'local:credential',
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'staff_created',
        entityType: 'user',
        entityId: userId,
        metadata: { name, email, role, permissions: permissions as string[] },
      },
    });

    res.status(201).json({
      id: userId,
      name,
      email,
      role,
      status: 'active',
      permissions,
    });
  } catch (error) {
    next(toAppError(error));
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const staff = await requireAuth(req);

    if (staff.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Insufficient permissions');
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        mustChangePassword: true,
        permissions: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    res.json(user);
  } catch (error) {
    next(toAppError(error));
  }
});

router.patch('/:id/status', staffMutationLimiter, async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    const id = req.params.id as string;
    const { status } = req.body as { status: string };

    if (status !== 'active' && status !== 'deactivated') {
      throw new AppError('BAD_REQUEST', 'Status must be active or deactivated');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    if (user.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Cannot modify the Admin account');
    }

    if (!canManageUser(staff, user.role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You cannot modify this user');
    }

    requirePermission(staff, 'MODERATORS_DISABLE');

    await prisma.user.update({ where: { id }, data: { status: status as 'active' | 'deactivated' } });

    if (status === 'deactivated') {
      const { revokeAllStaffSessions } = await import('../../lib/guard.js');
      await revokeAllStaffSessions(id);
    }

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: `staff_${status === 'deactivated' ? 'deactivated' : 'activated'}`,
        entityType: 'user',
        entityId: id,
        metadata: { name: user.name, email: user.email, status },
      },
    });

    res.json({ id, status });
  } catch (error) {
    next(toAppError(error));
  }
});

router.post('/:id/reset-password', staffMutationLimiter, async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    if (user.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Cannot reset the Admin password');
    }

    if (!canManageUser(staff, user.role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You cannot modify this user');
    }

    requirePermission(staff, 'MODERATORS_RESET_PASSWORD');

    await prisma.user.update({ where: { id }, data: { mustChangePassword: true } });

    const { revokeAllStaffSessions } = await import('../../lib/guard.js');
    await revokeAllStaffSessions(id);

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'staff_password_reset',
        entityType: 'user',
        entityId: id,
        metadata: { name: user.name, email: user.email },
      },
    });

    res.json({ id, mustChangePassword: true });
  } catch (error) {
    next(toAppError(error));
  }
});

router.delete('/:id', staffMutationLimiter, async (req, res, next) => {
  try {
    const session = await getStaffSession(req);
    if (!session) {
      throw new AppError('UNAUTHORIZED', 'Authentication required');
    }

    if (session.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admin can delete staff accounts');
    }

    const id = req.params.id as string;

    if (id === session.user.id) {
      throw new AppError('BAD_REQUEST', 'Cannot delete your own account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    if (user.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Cannot delete the Admin account');
    }

    if (!canManageUser(session, user.role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You cannot delete this user');
    }

    requirePermission(session, 'MODERATORS_DELETE');

    const { revokeAllStaffSessions } = await import('../../lib/guard.js');
    await revokeAllStaffSessions(id);

    await prisma.account.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: 'staff_deleted',
        entityType: 'user',
        entityId: id,
        metadata: { name: user.name, email: user.email, role: user.role },
      },
    });

    res.json({ deleted: true });
  } catch (error) {
    next(toAppError(error));
  }
});

router.patch('/:id/permissions', staffMutationLimiter, async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    const id = req.params.id as string;

    if (staff.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admin can modify permissions');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    if (user.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Cannot modify Admin permissions');
    }

    if (!canManageUser(staff, user.role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You cannot modify this user');
    }

    const permissions = [...MODERATOR_DEFAULT_PERMISSIONS];

    await prisma.user.update({
      where: { id },
      data: { permissions },
    });

    res.json({ id, permissions });
  } catch (error) {
    next(toAppError(error));
  }
});

router.patch('/:id', staffMutationLimiter, async (req, res, next) => {
  try {
    const staff = await requireAuth(req);
    const id = req.params.id as string;

    if (staff.user.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Only admin can modify staff accounts');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Staff member not found');
    }

    if (user.role === 'admin') {
      throw new AppError('FORBIDDEN', 'Cannot modify the Admin account');
    }

    if (!canManageUser(staff, user.role as 'moderator')) {
      throw new AppError('FORBIDDEN', 'You cannot modify this user');
    }

    requirePermission(staff, 'MODERATORS_UPDATE');

    const updateSchema = z.object({
      name: z.string().min(1, 'Name is required').optional(),
      email: z.string().email('Valid email is required').optional(),
    });

    const parsed = updateSchema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.email !== undefined) {
      if (parsed.email !== user.email) {
        const existing = await prisma.user.findFirst({ where: { email: parsed.email } });
        if (existing) {
          throw new AppError('CONFLICT', 'Email already in use');
        }
      }
      updateData.email = parsed.email;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('BAD_REQUEST', 'No fields to update');
    }

    await prisma.user.update({ where: { id }, data: updateData });

    await prisma.activityLog.create({
      data: {
        actorId: staff.user.id,
        actorRole: staff.user.role,
        action: 'staff_updated',
        entityType: 'user',
        entityId: id,
        metadata: { name: user.name, email: user.email, changes: Object.keys(updateData) },
      },
    });

    res.json({ id, ...updateData });
  } catch (error) {
    next(toAppError(error));
  }
});

router.post('/self-change-password', staffMutationLimiter, async (req, res, next) => {
  try {
    const session = await getStaffSession(req);
    if (!session) {
      throw new AppError('UNAUTHORIZED', 'Authentication required');
    }

    const body = req.body as { newPassword?: string };
    const newPassword = body?.newPassword;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new AppError('BAD_REQUEST', 'Password must be at least 8 characters');
    }

    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: 'credential' },
    });
    if (!account) {
      throw new AppError('NOT_FOUND', 'Account not found');
    }

    const context = await auth.$context;
    const hashedPassword = await context.password.hash(newPassword);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { mustChangePassword: false, updatedAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    next(toAppError(error));
  }
});

export default router;
