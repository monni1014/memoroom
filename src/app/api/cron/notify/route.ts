import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendKakaoAlimtalk } from "@/lib/kakao";

export const dynamic = "force-dynamic";

// Vercel Cron 등 외부 스케줄러에서 주기적으로 호출할 엔드포인트
export async function GET() {
  try {
    const now = new Date();
    // 2시간 뒤
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // 현재 시간부터 2시간 뒤 사이버 시작되는, 아직 알림이 발송되지 않은 예약 조회
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        startTime: {
          gte: now,
          lte: twoHoursLater,
        },
        notified: false,
      },
    });

    for (const res of upcomingReservations) {
      // 카카오 알림톡 발송 로직 호출
      const success = await sendKakaoAlimtalk(
        res.customerName || "고객",
        res.startTime.toISOString(),
        "010-0000-0000" // 실제 구현 시 DB에서 핸드폰 번호 조회 필요
      );

      if (success) {
        await prisma.reservation.update({
          where: { id: res.id },
          data: { notified: true },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedCount: upcomingReservations.length 
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
