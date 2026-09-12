import 'dotenv/config';
import { auth } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Administrator';

  if (!email || !password) {
    console.error(
      JSON.stringify({
        msg: 'missing_bootstrap_env',
        required: ['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD'],
      }),
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error(JSON.stringify({ msg: 'password_too_short', minimum: 8 }));
    process.exit(1);
  }

  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    if (existingUser.role !== 'admin') {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'admin',
          mustChangePassword: true,
        },
      });
      console.log(JSON.stringify({ msg: 'existing_user_upgraded_to_admin', email }));
    } else {
      console.log(JSON.stringify({ msg: 'already_seeded', adminEmail: existingUser.email }));
    }
    return;
  }

  const context = await auth.$context;
  const hash = await context.password.hash(password);

  const user = await context.internalAdapter.createUser({
    name,
    email,
    emailVerified: true,
    role: 'admin',
    status: 'active',
    mustChangePassword: true,
    permissions: '[]',
  } as never, { method: 'admin' });

  await context.internalAdapter.createAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    issuer: 'local:credential',
    password: hash,
  } as never);

  console.log(JSON.stringify({ msg: 'bootstrap_admin_created', email }));
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(JSON.stringify({ msg: 'seed_failed', error: String(err).slice(0, 300) }));
    process.exit(1);
  });
