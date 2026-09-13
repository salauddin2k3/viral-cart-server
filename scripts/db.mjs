import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import EmbeddedPostgres from 'embedded-postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const dataDir = path.join(serverRoot, '.pgdata');
const envPath = path.join(serverRoot, '.env');
const pidPath = path.join(dataDir, 'keeper.pid');

const PORT = 5433;
const USER = 'ecom_app';
const DB_NAME = 'ecommerce';

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnvMissing(updates) {
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/) : [];
  const known = new Set(existing.map((l) => (l.match(/^([A-Z0-9_]+)=/) || [])[1]).filter(Boolean));
  for (const [key, value] of Object.entries(updates)) {
    if (!known.has(key)) existing.push(`${key}=${value}`);
  }
  fs.writeFileSync(envPath, existing.join('\n') + '\n', 'utf8');
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

async function main() {
  const command = process.argv[2] ?? 'up';

  if (command === 'stop') {
    if (fs.existsSync(pidPath)) {
      const pid = Number(fs.readFileSync(pidPath, 'utf8').trim());
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        console.log(JSON.stringify({ msg: 'db_stopped', pid }));
      } catch {
        console.log(JSON.stringify({ msg: 'db_stop_failed_or_already_stopped', pid }));
      }
      fs.rmSync(pidPath, { force: true });
    } else {
      console.log(JSON.stringify({ msg: 'no_pid_file' }));
    }
    return;
  }

  if (command === 'status') {
    console.log(JSON.stringify({ msg: 'db_status', portOpen: await isPortOpen(PORT) }));
    return;
  }

  if (await isPortOpen(PORT)) {
    console.log(JSON.stringify({ msg: 'db_already_running', port: PORT }));
    return;
  }

  const env = readEnvFile();
  const password = env.EMBEDDED_PG_PASSWORD ?? randomBytes(16).toString('hex');

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password,
    port: PORT,
    persistent: true,
  });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log(JSON.stringify({ msg: 'initialising_cluster', dataDir }));
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(JSON.stringify({ msg: 'database_created', database: DB_NAME }));
  } catch (err) {
    console.log(JSON.stringify({ msg: 'database_create_skipped', detail: String(err).slice(0, 120) }));
  }

  writeEnvMissing({
    PORT: '5000',
    DATABASE_URL: `postgresql://${USER}:${password}@localhost:${PORT}/${DB_NAME}?schema=public`,
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    NODE_ENV: 'development',
    EMBEDDED_PG_PASSWORD: password,
  });

  fs.writeFileSync(pidPath, String(process.pid));

  console.log(JSON.stringify({ msg: 'db_ready', port: PORT, user: USER, database: DB_NAME }));

  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(JSON.stringify({ msg: 'db_script_failed', error: String(err) }));
  process.exit(1);
});
