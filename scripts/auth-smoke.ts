import 'dotenv/config';
import { randomBytes } from 'crypto';
import { auth, isSessionWithinLifetime } from '../src/lib/auth.js';
import { requireAuth } from '../src/lib/guard.js';
import { prisma } from '../src/lib/prisma.js';

const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:5000';
const COOKIE_NAME = 'better-auth.session_token';

interface CreatedUser {
  id: string;
  email: string;
}

async function uniqueEmail(tag: string): Promise<string> {
  return `${tag}-${randomBytes(4).toString('hex')}@smoke.test`;
}

async function createUserWithCredential(
  email: string,
  password: string,
  overrides: Record<string, unknown> = {},
): Promise<CreatedUser> {
  const context = await auth.$context;
  const hash = await context.password.hash(password);
  const user = await context.internalAdapter.createUser(
    {
      name: 'Smoke User',
      email,
      emailVerified: true,
      role: 'moderator',
      status: 'active',
      mustChangePassword: false,
      ...overrides,
    } as never,
    { method: 'admin' },
  );
  await context.internalAdapter.createAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    issuer: 'local:credential',
    password: hash,
  } as never);
  return { id: user.id, email };
}

async function cleanup(emails: string[]): Promise<void> {
  for (const email of emails) {
    await prisma.user.deleteMany({ where: { email } });
  }
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${label}`);
  }
  console.log(JSON.stringify({ pass: label }));
}

async function postJson(
  path: string,
  body: unknown,
  cookie?: string,
): Promise<{ status: number; setCookie: string | null; bodyText: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, setCookie: res.headers.get('set-cookie'), bodyText: await res.text() };
}

async function signInCookie(email: string, password: string): Promise<string> {
  const res = await postJson('/api/auth/sign-in/email', { email, password });
  if (res.status !== 200) {
    throw new Error(`sign-in failed (${res.status}): ${res.bodyText.slice(0, 120)}`);
  }
  const match = (res.setCookie ?? '').match(/better-auth\.session_token=[^;]+/);
  if (!match) {
    throw new Error('no session cookie returned');
  }
  return match[0];
}

const scenarios: Record<string, () => Promise<void>> = {
  mkuser: async () => {
    const email = process.argv[3] ?? (await uniqueEmail('mu'));
    const password = process.argv[4] ?? 'MkUserPass1';
    await createUserWithCredential(email, password);
    console.log(JSON.stringify({ msg: 'user_created', email }));
  },

  roundtrip: async () => {
    const email = await uniqueEmail('rt');
    await createUserWithCredential(email, 'ValidPass123');
    const context = await auth.$context;
    const sessions = await context.internalAdapter.listSessions(
      (await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id,
    );
    assert(sessions.length === 0, 'new user starts with zero sessions');
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    assert(dbUser.role === 'moderator', 'default role is moderator');
    assert(dbUser.status === 'active', 'default status is active');
    assert(dbUser.mustChangePassword === false, 'mustChangePassword defaults false');
    await cleanup([email]);
  },

  'session-policy': async () => {
    const email = await uniqueEmail('pol');
    await createUserWithCredential(email, 'ValidPass123');
    let cookie = await signInCookie(email, 'ValidPass123');

    const sess = await prisma.session.findFirstOrThrow({
      where: { user: { email } },
      orderBy: { createdAt: 'desc' },
    });
    assert(isSessionWithinLifetime(sess), 'POSITIVE CONTROL: fresh session within policy');
    const resolved = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert(resolved !== null && resolved.session !== null, 'POSITIVE CONTROL: valid session resolves');

    await prisma.session.update({
      where: { id: sess.id },
      data: { updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    });
    let rejected = false;
    try {
      await requireAuth({ headers: { cookie } });
    } catch {
      rejected = true;
    }
    assert(rejected, 'idle > 120min rejected by guard');
    const afterIdle = await prisma.session.count({ where: { user: { email } } });
    assert(afterIdle === 0, 'idle expiry destroys the server-side session');

    cookie = await signInCookie(email, 'ValidPass123');
    await prisma.session.updateMany({
      where: { user: { email } },
      data: { createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) },
    });
    rejected = false;
    try {
      await requireAuth({ headers: { cookie } });
    } catch {
      rejected = true;
    }
    assert(rejected, 'absolute lifetime > 12h rejected by guard');

    cookie = await signInCookie(email, 'ValidPass123');
    await prisma.session.updateMany({
      where: { user: { email } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const gone = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert(gone === null || gone.session === null, 'expired session fails closed');
    await cleanup([email]);
  },

  'password-length': async () => {
    const email = await uniqueEmail('pw');
    await createUserWithCredential(email, 'OldPass123');
    const cookie = await signInCookie(email, 'OldPass123');
    const headers = new Headers({ cookie });

    const shortAttempt = await postJson(
      '/api/auth/change-password',
      { currentPassword: 'OldPass123', newPassword: 'Ab1' },
      cookie,
    );
    const shortRejected = shortAttempt.status !== 200;
    assert(shortRejected, 'sub-8-char password rejected');

    const okChange = await postJson(
      '/api/auth/change-password',
      { currentPassword: 'OldPass123', newPassword: 'NewPass456' },
      cookie,
    );
    assert(okChange.status === 200, 'valid password change succeeds');
    const account = await prisma.account.findFirstOrThrow({
      where: { user: { email } },
      select: { password: true },
    });
    assert(account.password !== null && !account.password.includes('OldPass'), 'hash rotated in DB');
    await cleanup([email]);
  },

  signin: async () => {
    const email = await uniqueEmail('si');
    await createUserWithCredential(email, 'CorrectHorse1');

    const ok = await postJson('/api/auth/sign-in/email', { email, password: 'CorrectHorse1' });
    assert(ok.status === 200, 'correct credentials accepted over HTTP');
    assert((ok.setCookie ?? '').toLowerCase().includes('httponly'), 'session cookie is httpOnly');
    assert((ok.setCookie ?? '').includes('SameSite=Lax'), 'session cookie SameSite=Lax');

    const wrongPw = await postJson('/api/auth/sign-in/email', { email, password: 'WrongPassword9' });
    const unknownEmail = await postJson('/api/auth/sign-in/email', {
      email: 'nobody-xyz@smoke.test',
      password: 'Whatever123',
    });
    assert(wrongPw.status === unknownEmail.status, 'wrong-password vs unknown-email same status');
    assert(wrongPw.bodyText === unknownEmail.bodyText, 'generic identical error body');
    await cleanup([email]);
  },

  lockout: async () => {
    const email = await uniqueEmail('lock');
    await createUserWithCredential(email, 'RightPass123');
    let sawThrottle = false;
    for (let i = 0; i < 7; i += 1) {
      const r = await postJson('/api/auth/sign-in/email', { email, password: 'BadPass999' });
      if (r.status === 429) {
        sawThrottle = true;
      }
    }
    assert(sawThrottle, 'lockout returns 429 within burst');
    const lockRows = await prisma.activityLog.count({ where: { action: 'auth_lockout' } });
    assert(lockRows >= 1, 'auth_lockout written to activity_log');
    await cleanup([email]);
  },

  guards: async () => {
    const email = await uniqueEmail('gd');
    await createUserWithCredential(email, 'GuardPass1');
    const cookie = await signInCookie(email, 'GuardPass1');
    const reqLike = { headers: { cookie } };

    const ctxOk = await requireAuth(reqLike);
    assert(ctxOk.user.role === 'moderator', 'moderator passes unscoped guard');

    let forbidden = false;
    try {
      await requireAuth(reqLike, 'admin');
    } catch (err) {
      forbidden = String((err as Error).message).includes('permissions');
    }
    assert(forbidden, 'moderator blocked from admin-scoped guard');

    const userId = (
      await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
    ).id;
    await prisma.user.update({ where: { id: userId }, data: { status: 'deactivated' } });

    let unauthorized = false;
    try {
      await requireAuth(reqLike);
    } catch (err) {
      unauthorized = String((err as Error).message).includes('required');
    }
    assert(unauthorized, 'deactivated user rejected');

    const remainingSessions = await prisma.session.count({ where: { userId } });
    assert(remainingSessions === 0, 'deactivation revoked ALL sessions immediately');
    await cleanup([email]);
  },

  logout: async () => {
    const email = await uniqueEmail('lo');
    await createUserWithCredential(email, 'LogoutPass1');
    const cookie = await signInCookie(email, 'LogoutPass1');
    const res = await postJson('/api/auth/sign-out', {}, cookie);
    assert(res.status === 200, 'logout succeeds');
    const after = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert(after === null || after.session === null, 'server session destroyed on logout');
    await cleanup([email]);
  },

  'audit-rows': async () => {
    const events = ['login_success', 'login_failed', 'logout', 'password_change'];
    for (const event of events) {
      const count = await prisma.activityLog.count({ where: { action: event } });
      assert(count >= 1, `activity_log contains ${event}`);
    }
    const rows = await prisma.activityLog.findMany({
      where: { entityType: 'auth' },
      select: { metadata: true },
      take: 50,
    });
    const serialized = JSON.stringify(rows);
    assert(!serialized.includes('@smoke.test'), 'no emails stored in audit metadata');
    assert(!serialized.toLowerCase().includes('password'), 'no passwords stored in audit metadata');
  },
};

async function main(): Promise<void> {
  const scenario = process.argv[2];
  if (!scenario || !scenarios[scenario]) {
    console.error(JSON.stringify({ msg: 'unknown_scenario', available: Object.keys(scenarios) }));
    process.exit(1);
  }
  await scenarios[scenario]();

  await prisma.$disconnect();  console.log(JSON.stringify({ msg: 'scenario_complete', scenario }));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));
  })
  .catch((err: unknown) => {
    console.error(JSON.stringify({ msg: 'scenario_failed', scenario: process.argv[2], error: String(err).slice(0, 300) }));
    process.exit(1);
  });
