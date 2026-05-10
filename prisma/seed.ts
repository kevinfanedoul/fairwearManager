import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@fairwear.ma";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";
const NAME = process.env.ADMIN_NAME ?? "Admin Fairwear";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (error && error.message !== "User already registered") {
    throw new Error(`Supabase Auth error: ${error.message}`);
  }

  const authId = data?.user?.id;

  // Upsert in Prisma User table
  if (authId) {
    await prisma.user.upsert({
      where: { id: authId },
      update: { role: "ADMIN", name: NAME },
      create: { id: authId, email: EMAIL, name: NAME, role: "ADMIN" },
    });
    console.log(`✅ Admin créé : ${EMAIL} / ${PASSWORD}`);
  } else {
    // User already exists in Auth — find by email
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === EMAIL);
    if (existing) {
      await prisma.user.upsert({
        where: { id: existing.id },
        update: { role: "ADMIN", name: NAME },
        create: { id: existing.id, email: EMAIL, name: NAME, role: "ADMIN" },
      });
      console.log(`✅ Admin existant mis à jour : ${EMAIL}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
