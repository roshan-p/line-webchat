/**
 * Sends a signed webhook to the local server so there is a conversation to open
 * during development. Real LINE webhooks go to the deployed URL, so without
 * this the local sidebar stays empty and nothing can be replied to.
 *
 *   npm run seed
 *   npm run seed -- --user Ualice --text "hello" --count 3
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key) args[key] = argv[i + 1];
  }
  return args;
}

loadEnvLocal();

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.url ?? process.env.SEED_URL ?? 'http://localhost:3000';
const userId = args.user ?? 'Ulocaldev00000000000000000000001';
const text = args.text ?? 'สวัสดีครับ ทดสอบจากเครื่อง local';
const count = Number(args.count ?? 1);
const secret = process.env.LINE_CHANNEL_SECRET;

if (!secret) {
  console.error('LINE_CHANNEL_SECRET is not set. Add it to .env.local first.');
  process.exit(1);
}

for (let i = 0; i < count; i += 1) {
  const body = JSON.stringify({
    destination: 'local',
    events: [
      {
        type: 'message',
        mode: 'active',
        timestamp: Date.now(),
        source: { type: 'user', userId },
        replyToken: crypto.randomUUID(),
        message: {
          id: crypto.randomUUID(),
          type: 'text',
          text: count > 1 ? `${text} (${i + 1})` : text,
        },
      },
    ],
  });

  const signature = crypto.createHmac('SHA256', secret).update(body).digest('base64');

  const res = await fetch(`${baseUrl}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-line-signature': signature },
    body,
  });

  if (!res.ok) {
    console.error(`Seed failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
}

console.log(`Seeded ${count} message(s) for ${userId} at ${baseUrl}`);
