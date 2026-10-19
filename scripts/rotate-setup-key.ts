import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function rotateKey() {
  const keyPath = path.resolve(process.cwd(), '.admin-setup-key');
  const newKey = crypto.randomBytes(24).toString('hex');

  fs.writeFileSync(keyPath, newKey, { encoding: 'utf-8', mode: 0o600 });
  console.log('✓ Admin setup key rotated successfully.');
  console.log('  Stored securely in .admin-setup-key with 0600 permissions.');
  console.log('  Notice: The new key has not been printed to terminal or logs to prevent exposure.');
  console.log('  To retrieve it securely in a private shell session: cat .admin-setup-key');
}

rotateKey();
