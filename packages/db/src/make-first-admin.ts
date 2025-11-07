/**
 * Script to make the first user an admin
 * Run this script to grant admin status to the first user in the database
 *
 * Usage:
 *   bun run packages/db/src/make-first-admin.ts
 */

// Load environment variables - same approach as prisma.config.ts
import dotenv from "dotenv";

// Load from apps/server/.env (same as prisma.config.ts)
dotenv.config({
    path: "../../apps/server/.env",
});

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL environment variable is not set.");
    console.error(
        "   Please ensure you have a .env file in apps/server/.env with DATABASE_URL."
    );
    console.error(
        "   Example: DATABASE_URL=postgresql://user:password@localhost:5432/marketplace"
    );
    process.exit(1);
}

import prisma from "./index";

async function makeFirstAdmin() {
    console.log("🔍 Checking for existing admins...");

    // Check if there are any admins
    const existingAdmins = await prisma.user.findMany({
        where: { isAdmin: true },
    });

    if (existingAdmins.length > 0) {
        console.log(`✅ Found ${existingAdmins.length} existing admin(s):`);
        existingAdmins.forEach((admin) => {
            console.log(`   - ${admin.name} (${admin.email})`);
        });
        console.log("\nTo make a new user an admin, use the admin dashboard.");
        return;
    }

    // Find the first user
    const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
    });

    if (!firstUser) {
        console.log("❌ No users found in the database.");
        console.log("   Please create a user account first.");
        return;
    }

    if (firstUser.isAdmin) {
        console.log(
            `✅ User ${firstUser.name} (${firstUser.email}) is already an admin.`
        );
        return;
    }

    // Make the first user an admin
    await prisma.user.update({
        where: { id: firstUser.id },
        data: { isAdmin: true },
    });

    console.log("✅ Successfully granted admin status to:");
    console.log(`   Name: ${firstUser.name}`);
    console.log(`   Email: ${firstUser.email}`);
    console.log(`   ID: ${firstUser.id}`);
    console.log("\n🎉 You can now access the admin dashboard!");
}

makeFirstAdmin()
    .catch((error) => {
        console.error("❌ Error making first admin:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
