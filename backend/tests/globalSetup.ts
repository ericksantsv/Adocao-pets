import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Recria um banco SQLite limpo (prisma/test.db) só para os testes.
export default function setup() {
  for (const f of ['test.db', 'test.db-journal']) rmSync(join(__dirname, '..', 'prisma', f), { force: true });
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  });
}
