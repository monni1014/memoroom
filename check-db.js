const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function count() {
  const c = await prisma.reservation.count();
  console.log("DB_COUNT=" + c);
  process.exit(0);
}
count();
