import { Calendar, Users, Coffee, TrendingUp, RefreshCw, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import EmailSyncButton from "./EmailSyncButton";
import AutoRefresh from "./AutoRefresh";
import { UNCATEGORIZED_LABEL } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Get current date boundaries
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Fetch today's reservations
  const todayReservations = await prisma.reservation.findMany({
    where: {
      startTime: {
        gte: startOfToday,
        lte: endOfToday
      }
    },
    include: {
      usageLog: true
    }
  });

  // Calculate statistics across database
  const allReservations = await prisma.reservation.findMany({ include: { usageLog: true } });

  // 취소된 예약은 실제 이용이 아니므로 누적 이용객/커피 통계에서 제외
  const activeReservations = allReservations.filter(r => r.status !== "CANCELLED");
  const totalGuests = activeReservations.reduce((sum, r) => sum + (r.usageLog?.headCount ?? 0), 0);
  const totalCoffee = activeReservations.reduce((sum, r) => sum + (r.usageLog?.coffeeCount ?? 0), 0);

  // 누적 매출: 취소 건의 환불수수료도 매출이므로 전체 합산 (취소 시 price에 수수료가 들어감)
  const totalRevenue = allReservations.reduce((sum, res) => sum + res.price, 0);

  // Format revenue text
  const revenueText = totalRevenue >= 10000 
    ? (totalRevenue / 10000).toFixed(1) + "만" 
    : totalRevenue.toLocaleString();

  // Room counts
  const room1Count = allReservations.filter(r => r.roomName === "머무룸1").length;
  const room2Count = allReservations.filter(r => r.roomName === "머무룸2").length;

  // Get all reservations sorted by startTime
  const futureReservations = await prisma.reservation.findMany({
    orderBy: {
      startTime: "asc"
    },
    include: {
      usageLog: true
    }
  });

  const getSourceDisplay = (source: string) => {
    switch(source) {
      case "naver": return "네이버";
      case "spacecloud": return "스페이스클라우드";
      case "direct": return "직접";
      default: return "직접";
    }
  };

  const formatTimeRange = (start: Date, end: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const m = `${start.getMonth() + 1}/${start.getDate()}`;
    const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    return `[${m}] ${startStr} - ${endStr}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-20 max-w-7xl mx-auto w-full">
      <AutoRefresh />
      <header className="pt-8 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            머무룸 대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">실시간 예약 및 연동 이용현황을 분석합니다.</p>
        </div>
        <EmailSyncButton />
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">오늘 예약</p>
          <p className="text-2xl font-semibold text-slate-900">{todayReservations.length}건</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">누적 이용객</p>
          <p className="text-2xl font-semibold text-slate-900">{totalGuests}명</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-sky-50 rounded-full text-sky-600">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">공간별 예약</p>
          <p className="text-lg font-semibold text-slate-900">
            <span className="text-sky-600">룸1</span> {room1Count} · <span className="text-purple-600">룸2</span> {room2Count}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-rose-50 rounded-full text-rose-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">누적 매출</p>
          <p className="text-2xl font-semibold text-slate-900">{revenueText}</p>
        </div>
      </section>

      {/* Upcoming Reservations */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">전체 예약 현황 ({futureReservations.length}건)</h2>
          <span className="text-xs text-slate-400">최근 날짜순</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {futureReservations.length === 0 ? (
            <div className="lg:col-span-2 text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              등록된 예약 일정이 없습니다.<br />
              <span className="text-xs">캘린더의 초록색 🔄 버튼으로 메일을 동기화해 보세요!</span>
            </div>
          ) : (
            futureReservations.map((res) => {
              const isCancelled = res.status === "CANCELLED";
              const borderColors = isCancelled
                ? "border-l-slate-300"
                : res.source === "naver" ? "border-l-green-500" :
                  res.source === "spacecloud" ? "border-l-indigo-500" : "border-l-amber-500";
              const labelColors =
                res.source === "naver" ? "bg-green-50 hover:bg-green-100 text-green-700" :
                res.source === "spacecloud" ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" : "bg-amber-50 hover:bg-amber-100 text-amber-700";
              const roomColors =
                res.roomName === "머무룸1" ? "bg-sky-50 text-sky-700" :
                res.roomName === "머무룸2" ? "bg-purple-50 text-purple-700" : "bg-teal-50 text-teal-700";

              return (
                <div
                  key={res.id}
                  className={`p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border flex justify-between items-center border-l-4 ${borderColors} ${
                    isCancelled ? "bg-slate-100 border-slate-200" : "bg-white border-slate-100"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isCancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                      {formatTimeRange(new Date(res.startTime), new Date(res.endTime))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {isCancelled && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          🚫 취소됨
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${labelColors}`}>
                        {getSourceDisplay(res.source)}
                      </span>
                      {!res.emailId && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                          ✍️수기
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${roomColors}`}>
                        {res.roomName}
                      </span>
                      <strong className={isCancelled ? "text-slate-500" : "text-slate-800"}>{res.customerName}</strong>
                      {!isCancelled && !res.isPaid && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-600">
                          💸 미결제
                        </span>
                      )}
                      <span>· {res.usageLog?.headCount || 0}명 ({res.usageLog?.purpose || UNCATEGORIZED_LABEL}{res.usageLog?.detail ? ` · ${res.usageLog.detail}` : ""})</span>
                      {res.price > 0 && (
                        <span className={`font-medium ${isCancelled ? "text-slate-500" : "text-emerald-600"}`}>
                          · {res.price.toLocaleString()}원{isCancelled ? " (수수료)" : ""}
                        </span>
                      )}
                      {!isCancelled && res.discount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600">
                          🎟️ 쿠폰 -{res.discount.toLocaleString()}원
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                    isCancelled
                      ? "bg-slate-200 text-slate-500 border-slate-200"
                      : "bg-slate-50 text-slate-600 border-slate-100"
                  }`}>
                    {isCancelled ? "취소" : new Date(res.endTime) < new Date() ? "완료" : "대기중"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
