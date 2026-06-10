const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.reservation.count();
  fs.writeFileSync('C:\\Users\\monni\\.gemini\\antigravity\\scratch\\memoroom\\count.txt', 'COUNT: ' + count);
  console.log('COUNT:', count);
}
main().catch(console.error).finally(() => process.exit(0));
