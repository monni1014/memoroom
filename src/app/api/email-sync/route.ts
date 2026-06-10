import { NextResponse } from "next/server";
import { syncEmails } from "@/lib/email-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[API] 메일 동기화 수동 실행...");
    const result = await syncEmails();
    
    return NextResponse.json({
      success: true,
      message: `동기화 완료: ${result.processed}건 확인, ${result.newReservations}건 신규 등록`,
      ...result,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] 메일 동기화 에러:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "메일 동기화 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
