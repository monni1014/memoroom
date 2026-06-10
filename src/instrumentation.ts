// Next.js 서버 부팅 시 1회 실행되는 훅 (dev/prod 공통).
// 여기서 node-cron으로 1분마다 메일 자동 동기화를 등록한다.
export async function register() {
  // Edge 런타임에서는 실행하지 않음 (node 런타임에서만 IMAP/Prisma 사용 가능)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // dev 핫리로드 시 중복 등록 방지
  const g = globalThis as unknown as { __emailSyncCronStarted?: boolean };
  if (g.__emailSyncCronStarted) return;
  g.__emailSyncCronStarted = true;

  const { schedule } = await import("node-cron");
  const { syncEmails } = await import("@/lib/email-sync");

  let running = false; // 이전 동기화가 안 끝났으면 건너뛰어 중복 접속 방지

  // "*/3 * * * *" = 매 3분
  schedule("*/3 * * * *", async () => {
    if (running) {
      console.log("[Cron] 이전 동기화 진행 중 - 이번 주기 건너뜀");
      return;
    }
    running = true;
    try {
      const r = await syncEmails();
      console.log(`[Cron] 자동 동기화 완료: 확인 ${r.processed}건, 등록/취소 ${r.newReservations}건`);
    } catch (e) {
      console.error("[Cron] 자동 동기화 에러:", e);
    } finally {
      running = false;
    }
  });

  console.log("[Cron] 이메일 자동 동기화 시작 (3분 간격)");
}
