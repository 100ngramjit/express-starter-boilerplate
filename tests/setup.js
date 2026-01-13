const { prisma } = require("../src/db/prisma");

// Clean up database before all tests
beforeAll(async () => {
  // Delete all data in correct order (respecting foreign keys)
  await prisma.todo.deleteMany();
  await prisma.user.deleteMany();
});

// Clean up after each test
afterEach(async () => {
  await prisma.todo.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect Prisma after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
