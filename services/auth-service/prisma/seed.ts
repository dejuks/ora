
import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const requiredEnv = [
  "ADMIN_FIRST_NAME",
  "ADMIN_LAST_NAME",
  "ADMIN_USERNAME",
  "ADMIN_EMAIL",
  "ADMIN_INITIAL_PASSWORD",
];

for (const key of requiredEnv) {
  if (!process.env[key]?.trim()) {
    throw new Error(`${key} is required in the backend .env file.`);
  }
}

const firstName = process.env.ADMIN_FIRST_NAME!.trim();
const lastName = process.env.ADMIN_LAST_NAME!.trim();
const username = process.env.ADMIN_USERNAME!.trim().toLowerCase();
const email = process.env.ADMIN_EMAIL!.trim().toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD!;

if (password.length < 12) {
  throw new Error("ADMIN_INITIAL_PASSWORD must contain at least 12 characters.");
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("ADMIN_EMAIL must be a valid email address.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin(): Promise<void> {
  console.log("Starting ORA Super Admin seeder...");

  // Hash the password using Argon2id.
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.$transaction(async (tx) => {
    // 1. Find possible existing accounts.
    const [emailUser, usernameUser] = await Promise.all([
      tx.users.findFirst({
        where: {
          email,
          deleted_at: null,
        },
      }),
      tx.users.findFirst({
        where: {
          username,
          deleted_at: null,
        },
      }),
    ]);

    if (
      emailUser &&
      usernameUser &&
      emailUser.id !== usernameUser.id
    ) {
      throw new Error(
        "The supplied email and username belong to different accounts."
      );
    }

    let admin = emailUser || usernameUser;

    // 2. Create or activate the Super Admin account.
    if (!admin) {
      admin = await tx.users.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          status: "ACTIVE",
          email_verified_at: new Date(),
        },
      });

      console.log("Super Admin user created.");
    } else {
      admin = await tx.users.update({
        where: { id: admin.id },
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
          email,
          status: "ACTIVE",
          email_verified_at:
            admin.email_verified_at || new Date(),
        },
      });

      console.log("Existing administrator account updated.");
    }

    // 3. Create administrator profile if missing.
    const profile = await tx.user_profiles.findUnique({
      where: { user_id: admin.id },
    });

    if (!profile) {
      await tx.user_profiles.create({
        data: {
          user_id: admin.id,
          job_title: "Super Administrator",
          organization: "Oromo Research Association",
        },
      });

      console.log("Administrator profile created.");
    }

    // 4. Create password credentials only if missing.
    // Existing passwords are never overwritten by this seeder.
    const credentials = await tx.user_credentials.findUnique({
      where: { user_id: admin.id },
    });

    if (!credentials) {
      await tx.user_credentials.create({
        data: {
          user_id: admin.id,
          password_hash: passwordHash,
          password_changed_at: new Date(),
          must_change_password: true,
        },
      });

      console.log("Initial password credentials created.");
    } else {
      console.log(
        "Existing password retained; no password reset performed."
      );
    }

    // 5. Find the system-level Super Admin role.
    let superAdminRole = await tx.roles.findFirst({
      where: {
        scope: "SYSTEM",
        OR: [
          { code: "SUPER_ADMIN" },
          { name: "Super Admin" },
        ],
      },
    });

    if (!superAdminRole) {
      superAdminRole = await tx.roles.create({
        data: {
          name: "Super Admin",
          code: "SUPER_ADMIN",
          scope: "SYSTEM",
          description:
            "System-level administrator of the ORA Digital Platform.",
          is_system_role: true,
          is_active: true,
          module_id: null,
        },
      });

      console.log("Super Admin system role created.");
    } else {
      superAdminRole = await tx.roles.update({
        where: { id: superAdminRole.id },
        data: {
          is_system_role: true,
          is_active: true,
        },
      });

      console.log("Existing Super Admin role found.");
    }

    // 6. Assign the system role to the administrator.
    const assignment = await tx.user_system_roles.findFirst({
      where: {
        user_id: admin.id,
        role_id: superAdminRole.id,
      },
    });

    if (!assignment) {
      await tx.user_system_roles.create({
        data: {
          user_id: admin.id,
          role_id: superAdminRole.id,
        },
      });

      console.log("Super Admin role assigned.");
    } else {
      console.log("Super Admin role already assigned.");
    }

    console.log("-----------------------------------");
    console.log("ORA SUPER ADMIN SEEDED SUCCESSFULLY");
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Status: ${admin.status}`);
    console.log(`Role: ${superAdminRole.name}`);
    console.log("-----------------------------------");
  });
}

seedSuperAdmin()
  .catch((error) => {
    console.error("Super Admin seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
