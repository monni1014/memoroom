"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 서버 컴포넌트(대시보드)를 주기적으로 새로고침해
 * 서버 cron이 받아온 새 예약/취소를 화면에 자동 반영한다.
 * 전체 페이지 리로드가 아니라 router.refresh()로 서버 데이터만 다시 가져온다.
 */
export default function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
