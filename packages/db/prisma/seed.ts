import prisma from "../src/index";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create basic categories
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Clothing", slug: "clothing" },
    { name: "Home & Garden", slug: "home-garden" },
    { name: "Books", slug: "books" },
    { name: "Sports & Outdoors", slug: "sports-outdoors" },
    { name: "Toys & Games", slug: "toys-games" },
    { name: "Health & Beauty", slug: "health-beauty" },
    { name: "Automotive", slug: "automotive" },
  ];

  console.log("Creating categories...");
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log("✅ Seeding complete!");
  console.log(`Created ${categories.length} categories`);
}

seed()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });