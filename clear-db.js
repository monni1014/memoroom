const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.usageLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  console.log('가짜 데이터 삭제 완료!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
