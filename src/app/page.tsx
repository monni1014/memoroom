import { Calendar, Users, Coffee, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_DATA = [
  {
    source: "naver",
    customerName: "김철수",
    startTime: "2026-06-15T14:00:00",
    endTime: "2026-06-15T17:00:00",
    price: 45000,
    headCount: 4,
    coffeeCount: 4,
    purpose: "회의"
  },
  {
    source: "spacecloud",
    customerName: "이영희",
    startTime: "2026-06-18T18:00:00",
    endTime: "2026-06-18T22:00:00",
    price: 80000,
    headCount: 6,
    coffeeCount: 0,
    purpose: "파티"
  },
  {
    source: "naver",
    customerName: "박지훈",
    startTime: "2026-06-12T10:00:00",
    endTime: "2026-06-12T12:00:00",
    price: 20000,
    headCount: 2,
    coffeeCount: 2,
    purpose: "스터디"
  },
  {
    source: "spacecloud",
    customerName: "최수진",
    startTime: "2026-06-05T13:00:00",
    endTime: "2026-06-05T16:00:00",
    price: 60000,
    headCount: 3,
    coffeeCount: 1,
    purpose: "촬영"
  },
  {
    source: "naver",
    customerName: "정민우",
    startTime: "2026-06-25T15:00:00",
    endTime: "2026-06-25T19:00:00",
    price: 120000,
    headCount: 8,
    coffeeCount: 8,
    purpose: "세미나"
  },
  {
    source: "manual",
    customerName: "임서연",
    startTime: "2026-06-03T16:00:00",
    endTime: "2026-06-03T18:00:00",
    price: 50000,
    headCount: 5,
    coffeeCount: 3,
    purpose: "회의"
  }
];

export default async function DashboardPage() {
  // Auto-seed if database is empty
  const count = await prisma.reservation.count();
  if (count === 0) {
    for (const item of SEED_DATA) {
      await prisma.reservation.create({
        data: {
          source: item.source,
          customerName: item.customerName,
          startTime: new Date(item.startTime),
          endTime: new Date(item.endTime),
          price: item.price,
          usageLog: {
            create: {
              headCount: item.headCount,
              coffeeCount: item.coffeeCount,
              purpose: item.purpose
            }
          }
        }
      });
    }
  }

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
  const allUsageLogs = await prisma.usageLog.findMany();
  const allReservations = await prisma.reservation.findMany();

  const totalGuests = allUsageLogs.reduce((sum, log) => sum + log.headCount, 0);
  const totalCoffee = allUsageLogs.reduce((sum, log) => sum + log.coffeeCount, 0);
  const totalRevenue = allReservations.reduce((sum, res) => sum + res.price, 0);

  // Format revenue text
  const revenueText = totalRevenue >= 10000 
    ? (totalRevenue / 10000).toFixed(1) + "만" 
    : totalRevenue.toLocaleString();

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
      case "naver": return "네이버 예약";
      case "spacecloud": return "스페이스클라우드";
      default: return "수동 예약";
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
    <div className="p-4 space-y-6 pb-20">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          머무룸 대시보드
        </h1>
        <p className="text-sm text-slate-500 mt-1">실시간 예약 및 연동 이용현황을 분석합니다.</p>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-4">
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
          <div className="p-3 bg-amber-50 rounded-full text-amber-600">
            <Coffee className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">제공된 커피</p>
          <p className="text-2xl font-semibold text-slate-900">{totalCoffee}잔</p>
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
        
        <div className="space-y-3">
          {futureReservations.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              등록된 예약 일정이 없습니다.
            </div>
          ) : (
            futureReservations.map((res) => {
              const borderColors = 
                res.source === "naver" ? "border-l-green-500" :
                res.source === "spacecloud" ? "border-l-indigo-500" : "border-l-amber-500";
              const labelColors = 
                res.source === "naver" ? "bg-green-50 hover:bg-green-100 text-green-700" :
                res.source === "spacecloud" ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" : "bg-amber-50 hover:bg-amber-100 text-amber-700";

              return (
                <div 
                  key={res.id} 
                  className={`bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-100 flex justify-between items-center border-l-4 ${borderColors}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatTimeRange(new Date(res.startTime), new Date(res.endTime))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${labelColors}`}>
                        {getSourceDisplay(res.source)}
                      </span>
                      <strong className="text-slate-800">{res.customerName}</strong>
                      <span>· {res.usageLog?.headCount || 0}명 ({res.usageLog?.purpose || "기타"})</span>
                      {res.price > 0 && (
                        <span className="text-emerald-600 font-medium">· {res.price.toLocaleString()}원</span>
                      )}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg border border-slate-100">
                    {new Date(res.endTime) < new Date() ? "완료" : "대기중"}
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
