"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Trash2, X, Wallet } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface UsageLog {
  id: string;
  headCount: number;
  coffeeCount: number;
  purpose: string | null;
}

interface Reservation {
  id: string;
  source: string;
  customerName: string | null;
  startTime: string;
  endTime: string;
  price: number;
  usageLog: UsageLog | null;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for manual booking
  const [formName, setFormName] = useState("");
  const [formSource, setFormSource] = useState("manual");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStartTime, setFormStartTime] = useState("14:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formPrice, setFormPrice] = useState("30000");
  const [formGuests, setFormGuests] = useState("4");
  const [formPurpose, setFormPurpose] = useState("회의");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error("Failed to load reservations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReservations();
  }, []);

  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Filter reservations for the selected date
  const selectedReservations = reservations.filter((res) =>
    isSameDay(new Date(res.startTime), selectedDate)
  );

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert("예약자명을 입력하세요.");

    try {
      setIsSubmitting(true);
      const startDateTime = `${formDate}T${formStartTime}:00`;
      const endDateTime = `${formDate}T${formEndTime}:00`;

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: formSource,
          customerName: formName,
          startTime: startDateTime,
          endTime: endDateTime,
          price: parseInt(formPrice, 10) || 0,
          headCount: parseInt(formGuests, 10) || 1,
          purpose: formPurpose,
        }),
      });

      if (response.ok) {
        setFormName("");
        setIsModalOpen(false);
        fetchReservations();
      } else {
        alert("예약 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Create booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("정말로 이 예약을 취소하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReservations();
      } else {
        alert("예약 취소에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSourceDisplay = (source: string) => {
    switch (source) {
      case "naver":
        return "네이버 예약";
      case "spacecloud":
        return "스페이스클라우드";
      default:
        return "수동 예약";
    }
  };

  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case "naver":
        return "bg-green-50 text-green-700 border border-green-100";
      case "spacecloud":
        return "bg-indigo-50 text-indigo-700 border border-indigo-100";
      default:
        return "bg-amber-50 text-amber-700 border border-amber-100";
    }
  };

  return (
    <div className="p-4 space-y-6 h-full flex flex-col pb-24">
      <header className="pt-8 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">통합 캘린더</h1>
          <p className="text-sm text-slate-500 mt-1">네이버 및 스페이스클라우드 예약 실시간 조회</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-3.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Calendar Grid Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col">
        {/* Calendar Header Nav */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-50 active:scale-95 transition-all">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            {format(currentDate, "yyyy년 MM월")}
          </h2>
          <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-50 active:scale-95 transition-all">
            <ChevronRight className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-semibold text-slate-400 py-2",
                idx === 0 && "text-rose-400",
                idx === 6 && "text-blue-400"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days of Month Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {Array.from({ length: firstDay.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            const isSameMonthOfActive = isSameMonth(day, currentDate);

            // Filter reservations for this day
            const dayReservations = reservations.filter((res) =>
              isSameDay(new Date(res.startTime), day)
            );

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center justify-between p-1.5 min-h-[55px] rounded-xl relative transition-all active:scale-95",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : isToday
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-slate-50 text-slate-700",
                  !isSameMonthOfActive && "opacity-30"
                )}
              >
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                
                {/* Dots container for day's reservations */}
                <div className="flex gap-0.5 justify-center h-2 mt-1">
                  {dayReservations.map((res) => {
                    const dotClass = 
                      res.source === "naver" ? "bg-green-500" :
                      res.source === "spacecloud" ? "bg-indigo-500" : "bg-amber-500";
                    return (
                      <span
                        key={res.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white" : dotClass
                        )}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Day Reservations List */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-800">
            {format(selectedDate, "M월 d일")} 일정 ({selectedReservations.length}건)
          </h3>
          <span className="text-xs text-slate-400">선택한 날짜별 예약</span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">예약 데이터를 불러오는 중...</div>
          ) : selectedReservations.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              이날 잡힌 예약이 없습니다. 우측 상단 &quot;+&quot; 버튼으로 수동 예약을 추가할 수 있습니다.
            </div>
          ) : (
            selectedReservations.map((res) => {
              const start = new Date(res.startTime);
              const end = new Date(res.endTime);
              const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

              return (
                <div
                  key={res.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start gap-2"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", getSourceBadgeStyle(res.source))}>
                        {getSourceDisplay(res.source)}
                      </span>
                      <strong className="text-slate-900 text-sm">{res.customerName}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-500">
                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(start)} - {formatTime(end)} ({Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60))}시간)</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>인원: {res.usageLog?.headCount || 1}명 ({res.usageLog?.purpose || "기타"})</span>
                      </p>
                      {res.price > 0 && (
                        <p className="flex items-center gap-1 text-slate-700">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          <span>요금: <strong className="text-slate-800">{res.price.toLocaleString()}원</strong></span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReservation(res.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition active:scale-95"
                    title="예약 및 로그 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Manual Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">새 수동 예약 추가</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">예약 소스</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="naver">네이버 예약</option>
                    <option value="spacecloud">스페이스클라우드</option>
                    <option value="manual">수동 예약</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">예약자 성함</label>
                  <input
                    type="text"
                    required
                    placeholder="김철수"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">예약 일자</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">시작 시간</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">종료 시간</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">인원 수 (명)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formGuests}
                    onChange={(e) => setFormGuests(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">이용 목적</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="회의">회의</option>
                    <option value="스터디">스터디</option>
                    <option value="파티">파티</option>
                    <option value="촬영">촬영</option>
                    <option value="세미나">세미나</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">결제 가격 (원화)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm rounded-xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? "예약 등록 중..." : "예약 생성 완료"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
