const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.reservation.count().then(c => {
  console.log('COUNT IS: ' + c);
  process.exit(0);
});
