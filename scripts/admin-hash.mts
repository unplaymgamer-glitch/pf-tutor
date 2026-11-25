// Creates the ADMIN_PASSWORD_HASH and SESSION_SECRET lines for your env file.
// The password is typed at a hidden prompt, never passed on the command line, never printed back.
//   npm run admin:hash
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

let muted = false;
const out = new Writable({ write(chunk, _enc, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
const rl = createInterface({ input: process.stdin, output: out, terminal: true });

function ask(q: string, hidden: boolean): Promise<string> {
  return new Promise((res) => { process.stdout.write(q); muted = hidden; rl.question("", (a) => { muted = false; if (hidden) process.stdout.write("\n"); res(a); }); });
}

const pw = await ask("Choose an admin password (min 12 characters, hidden): ", true);
const again = await ask("Type it again: ", true);
rl.close();
if (pw.length < 12) { console.error("Too short: use at least 12 characters."); process.exit(1); }
if (pw !== again) { console.error("The two entries do not match."); process.exit(1); }
const hash = bcrypt.hashSync(pw, 12);
console.log("\nPaste these lines into .env.local and into Vercel > Settings > Environment Variables (the hash is base64, so it has no $ signs that an env loader could corrupt):\n");
console.log(`ADMIN_PASSWORD_HASH_B64=${Buffer.from(hash).toString("base64")}`);
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
