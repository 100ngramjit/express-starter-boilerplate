const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

// Use singleton pattern to prevent multiple instances in development
const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma;

module.exports = { prisma };
