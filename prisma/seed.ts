import "dotenv/config";

import { prisma } from "@distribution-copilot/database";
import { auth } from "../apps/api/src/config/auth";

const SEED_EMAIL = "dev@example.com";
const SEED_PASSWORD = "password123";
const SEED_NAME = "Dev User";

async function seed() {
  // Ensure the test user exists. Better Auth manages hashing + Account creation.
  let user = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });

  if (!user) {
    await auth.api.signUpEmail({
      body: { email: SEED_EMAIL, password: SEED_PASSWORD, name: SEED_NAME },
    });
    user = await prisma.user.findUniqueOrThrow({ where: { email: SEED_EMAIL } });
    console.log(`Created user: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  } else {
    console.log(`User already exists: ${SEED_EMAIL}`);
  }

  // Replace products on every seed so re-seeding is idempotent.
  await prisma.product.deleteMany({ where: { userId: user.id } });

  await prisma.product.createMany({
    data: [
      {
        userId: user.id,
        name: "Distribution Copilot",
        website: "https://distributioncopliot.com",
        description:
          "Helps founders find relevant online conversations and generate context-aware draft replies.",
        audience:
          "Bootstrapped founders and early-stage startups looking to grow through organic community engagement.",
        competitors:
          "Manually searching Reddit and Hacker News, hiring a growth person, using Hootsuite",
      },
    ],
  });

  console.log("Seeded 1 product.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
