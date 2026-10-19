import bcrypt from 'bcryptjs';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();
  const newPassword = process.argv[3];

  if (!targetEmail || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  if (!existingUser) {
    console.error(`Error: User with email "${targetEmail}" does not exist in the database.`);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, existingUser.id));

  console.log(`✓ Password successfully updated for ${existingUser.name} (${existingUser.email}). Role: ${existingUser.role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Password reset error:', err);
  process.exit(1);
});
