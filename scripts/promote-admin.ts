import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();

  if (!targetEmail) {
    console.error('Usage: npx tsx scripts/promote-admin.ts <user-email>');
    process.exit(1);
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  if (!existingUser) {
    console.error(`User with email "${targetEmail}" does not exist in the database.`);
    process.exit(1);
  }

  const [updated] = await db
    .update(users)
    .set({ role: 'ADMIN', updatedAt: new Date() })
    .where(eq(users.id, existingUser.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    });

  console.log('✓ Successfully promoted user to ADMIN:');
  console.log(`  ID:    ${updated.id}`);
  console.log(`  Name:  ${updated.name}`);
  console.log(`  Email: ${updated.email}`);
  console.log(`  Role:  ${updated.role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Promotion error:', err);
  process.exit(1);
});
